# Zuneigung mit Folgen (Teil 2, Feature 4)

Datum: 2026-11-05
Status: im Gespräch freigegeben, Umsetzungsplan folgt nach dem Merge der Kursziele

## Ziel

Die Zuneigung (0 bis 100 %) hat bisher nur einen Satz im Status als Folge. Künftig hat sie
vier Stufen mit spürbaren Folgen: ein Bonus bei hoher Zuneigung und Strafen, wenn Byte
lange ganz ohne Zuneigung ist (halbes Futter, halbe Punkte, kein Miauen, schnellerer
Hunger). Die Strafen setzen erst nach einer Schutzfrist ein.

## Entscheidungen

- Gewählte Folgen: Stimmung und Aussehen, Punkte-Bonus bei hoher Zuneigung, Schmollen bei
  0 %, beschleunigter Hunger bei 0 %. Beim Schmollen wirkt Futter zusätzlich nur halb.
- Schutzfrist: Die Strafen gelten erst, wenn die Zuneigung seit mindestens 2 Stunden bei 0
  ist.
- Pflege-Aktionen (Streicheln, Spielen, Bürsten, Lernen) werden nie bestraft, sonst käme man
  nie aus dem Tief heraus.
- Alle Zahlen sind Konstanten in der neuen Datei `lib/mood.ts`, nicht in
  `lib/cat-rules.ts` (TheSCrafts Datei bleibt unangetastet). Die Zahlen sollten trotzdem
  gemeinsam mit TheSCraft festgelegt werden, weil sie die Balance verändern.
- Wiederbelebung setzt die Zuneigung auf mindestens 30 %, damit Byte nicht sofort wieder
  schmollt; Konstante `reviveLove` in `lib/mood.ts`.
- Den beschleunigten Hunger setzen wir um, aber über eine nachträgliche Abrechnung, nicht
  über einen Umbau der Todeslogik.

## Nicht Teil dieses Features

- Änderungen an `lib/cat-rules.ts`, neue Bilder von Byte, Strafen für Pflege-Aktionen,
  Statistik über die Stimmung, ein Abbau der Schutzfrist durch Pflege.

## Stufen

`lovePercent = max(0, ceil((cat.love - now) / loveUnit))` (wie bisher in `state()`),
`cat.love` ist der Zeitpunkt, an dem die Zuneigung 0 erreicht.

| Stufe | Bedingung | Wirkung |
|---|---|---|
| `happy` | `lovePercent >= 70` | Aktionen geben 25 % mehr Pfotenpunkte |
| `normal` | `30 <= lovePercent < 70` | keine |
| `lonely` | `1 <= lovePercent < 30`, oder `lovePercent = 0` innerhalb der Schutzfrist | nur Stimmung |
| `sulking` | `lovePercent = 0` und `now >= cat.love + 2 Stunden` | siehe unten |

Beim Schmollen (`sulking`):

1. Futter bringt nur die halbe Sättigung (`foodFactor = 0.5`).
2. Füttern und Miauen geben nur halbe Pfotenpunkte (aufgerundet, mindestens 1).
3. Miauen wird abgelehnt (HTTP 409, „Byte schmollt und antwortet nicht.“, kein Cooldown,
   kein Protokoll, keine Punkte).
4. Die Lebensfrist schmilzt zusätzlich mit dem Faktor 0,5 (insgesamt 1,5-fach), und zwar nur
   für die Zeit nach der Schutzfrist (Abrechnung, siehe unten).

Sobald die Zuneigung über 0 steigt, ist die Stufe sofort wieder `lonely` und die Strafen
enden.

## Konstanten und reine Funktionen (`lib/mood.ts`)

- `loveUnit = 360000` (gleich `unit` in `lib/server/db.ts`, ein Test prüft die
  Gleichheit), `happyFrom = 70`, `normalFrom = 30`, `happyBonus = 1.25`,
  `sulkGrace = 2 * 60 * 60 * 1000`, `hungerExtra = 0.5`, `settleStep = 60000`.
- `lovePercent(loveExpires, now)`, `moodLevel(loveExpires, now)`:
  `"happy" | "normal" | "lonely" | "sulking"`.
- `effectivePoints(action, points, level)`: `happy` gibt `Math.round(points * 1.25)`
  (kaufmännisch gerundet, damit Miauen bei 1 Punkt bleibt: Füttern/Streicheln 6, Miauen 1,
  Spielen 8, Bürsten 5, Lernen 10), `sulking` gibt für `food` und `meow`
  `Math.max(1, Math.ceil(points / 2))`, alles andere unverändert.
- `foodFactor(level)`: 0,5 bei `sulking`, sonst 1.

## Aktionen (`lib/server/actions/interact.ts`)

- Vor dem Batch liest der Server `SELECT love FROM cat WHERE id=1` und bestimmt die Stufe.
- Stufe `sulking` und Aktion `meow`: Antwort 409 mit dem Fehlertext und dem aktuellen State,
  es wird nichts geschrieben.
- Sonst werden `points = effectivePoints(...)` und die Futterwirkung
  `rule.food * foodLifetime / 100 * foodFactor(level)` vor dem Batch berechnet und an die
  **bestehenden** Anweisungen als Parameter übergeben (Punkte im `players`-Update und im
  Protokoll-Insert, Futterwirkung im `cat`-Update). Die Anweisungen selbst bleiben bis auf
  die eine Bedingung unten wortgleich.
- Eine zusätzliche Bedingung in der Cooldown-Anweisung: `AND love=?` mit dem gelesenen Wert
  (`... AND active<=? AND love=? ON CONFLICT ...`). Hat sich `cat.love` zwischen Lesen und
  Schreiben geändert, wird die Aktion abgelehnt (429 „Byte braucht noch einen Moment.“) und
  nichts geschrieben. `cat.love` ändert sich nur durch angenommene Aktionen (Abstand
  mindestens 5 Sekunden), das Fenster ist klein.

## Wiederbelebung (`lib/server/actions/revive.ts`)

Das `UPDATE cat` der abgeschlossenen Runde setzt zusätzlich `love=max(love,now+30*loveUnit)`
(Parameter `now+reviveLove*loveUnit`): Die Zuneigung steigt auf mindestens 30 %, eine höhere
wird nicht gesenkt. Eine unvollständige Runde ändert sie nicht.

## Beschleunigter Hunger (Abrechnung)

- Neue Spalte `cat.settled` (integer, nullable): Zeitpunkt der letzten Abrechnung.
- Neue Datei `lib/server/settle.ts` mit dem Statement
  `UPDATE cat SET food_expires=food_expires-CAST(? * (?-max(love+?,active,COALESCE(settled,0))) AS INTEGER),settled=? WHERE id=1 AND food_expires>? AND ?-max(love+?,active,COALESCE(settled,0))>=?`
  und den Parametern `hungerExtra, now, sulkGrace, now, now, now, sulkGrace, settleStep`.
  Es rechnet die Zeit seit `max(Zuneigung-0 + Schutzfrist, letzte Aktion, letzte
  Abrechnung)` aus und zieht den Anteil `hungerExtra` davon von `food_expires` ab. Es läuft
  nur, wenn Byte lebt (`food_expires > now`) und mindestens `settleStep` (60 s)
  aufgelaufen sind, also höchstens etwa 1.440 Schreibzugriffe pro Tag.
- Es steht als **erste** Anweisung im Batch von `state()` (vor dem `died`-Eintrag, damit ein
  durch die Abrechnung gestorbener Byte im selben Batch den Eintrag `died` mit der echten
  Todeszeit bekommt) und als erste Anweisung im Batch von `interact` (vor der
  Cooldown-Anweisung; dadurch verschiebt sich dort das Ergebnis `accepted` auf Index 1).
- Todeszeit, Cooldown-Prüfung, Wiederbelebungs-Runden und Anzeigen lesen weiter denselben
  Wert `food_expires` und bleiben konsistent. Nach dem Tod rechnet nichts mehr ab, nach
  einer Wiederbelebung beginnt die Zählung wegen `active = now` neu.

## API

`state()` liefert zusätzlich `loveExpires` (Wert von `cat.love`), `Data` bekommt
`loveExpires: number`. Der Client berechnet die Stufe mit `moodLevel(data.loveExpires, now)`
(mit der synchronen Uhr), sie wechselt dadurch live.

## Oberfläche

- `StatusCard`: Stimmungszeile nach Stufe, z. B. `sulking`: „Byte schmollt. Er frisst nur
  halb so viel und ignoriert Miauen.“, `lonely`: der bisherige Satz („Byte vermisst seine
  Kursmenschen.“), `happy`: „Byte schnurrt: Aktionen geben 25 % mehr Punkte.“ (die
  bisherigen Sätze für Hunger und „pudelwohl“ bleiben für die übrigen Fälle).
- `CatStage`: neue Prop `mood`, Klasse `mood-<stufe>` auf `.stage`; Standardtext der
  Sprechblase nach Stufe („schnurr!“, „miau!“, „miau …“, „…“). Der CSS-Look liegt in der
  neuen Datei `styles/mood.css` (in `app/globals.css` als **letzte** Zeile importiert),
  dezent, ohne Layoutänderung, verträgt sich mit den `fx-*`-Optiken und dem Gedenk-Look.
- `ActionPanel`: Punkteanzeige der Knöpfe über `effectivePoints`, Sättigungsanzeige beim
  Füttern mit `foodFactor`, der Knopf „Miauen“ ist beim Schmollen gesperrt und nennt den
  Grund.

## Tests

Vitest über die echte Route; `tests/setup.ts` ändert sich nicht, die Zuneigung wird per
`UPDATE cat SET love=...` gesetzt, die Zeit per `setTime`.

- `lib/mood.ts` an den Grenzen (70/69, 30/29, 1/0 %, Schutzfrist: genau 2 Stunden und 1
  Millisekunde danach), `effectivePoints` je Aktion und Stufe, `foodFactor`, `loveUnit ===
  unit` aus `lib/server/db.ts`.
- Bonus: Bei `happy` Punkte in Protokoll, Gesamtpunkten und Wochenwertung identisch erhöht.
- Schmollen: halbe Futterwirkung (Änderung von `food_expires`), halbe Punkte für Füttern,
  Miauen mit 409 und ohne Spuren, Pflege-Aktionen unverändert.
- Guard: Ändert sich `cat.love` zwischen Lesen und Batch, schreibt die Aktion nichts.
- Abrechnung: nicht vor der Schutzfrist, danach 0,5-fach, höchstens einmal pro 60 s,
  stoppt nach einer Aktion, ruht bei totem Byte, Tod durch Abrechnung schreibt `died` mit
  der Todeszeit, nach Wiederbelebung neue Zählung.
- API: `loveExpires` im State, auch abgemeldet.
- Stimmung, Texte, gesperrter Knopf und Look werden per Sichtprüfung im Browser geprüft.

## Rollout

- Migration `0009` mit `drizzle-kit generate` (`ALTER TABLE cat ADD settled integer`). Lokal
  einzeln und der Reihe nach auf eine bestehende Datenbank einspielen (README ergänzen).
  Ohne sie antwortet `GET /api/cat` mit 500 (`no such column`).
- Ein Hosting gibt es noch nicht. Beim Einrichten müssen die Migrationen `0000` bis `0009`
  der Reihe nach laufen.

## Risiken

- Abwärtsspirale: Für kleine Teams driftet die Zuneigung schon heute gegen 0 (ein Konto
  bringt pro 6 Stunden etwa 32,5 % bei 60 % Verlust). Mit allen vier Folgen und nur 2
  Stunden Schutzfrist kann ein sehr kleines Team Byte verlieren. Die Zahlen sind Konstanten
  und lassen sich schnell dämpfen; nach der Umsetzung sollte ein bis zwei Tage beobachtet
  werden.
- Die Abrechnung schreibt `food_expires`, ein Kernfeld, und läuft auch auf dem Lesepfad
  (`state()`), wie schon der Eintrag `died`.
- Konflikte mit paralleler Arbeit: `interact.ts`, `state.ts`, `cat-types.ts`, `page.tsx`,
  `ActionPanel.tsx`, `StatusCard.tsx`, `CatStage.tsx`.
- Wechselwirkung mit den Kurszielen: Punkte-Ziele werden langsamer erreicht, wenn Strafen
  greifen; Zähler für Aktionen und Miauen bleiben unberührt.
