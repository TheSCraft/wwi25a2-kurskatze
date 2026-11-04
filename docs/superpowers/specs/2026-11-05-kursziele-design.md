# Kurs-Ziele und Freischaltungen (Teil 2, Feature 3)

Datum: 2026-11-05
Status: im Gespräch freigegeben, Umsetzungsplan folgt

## Ziel

Der Kurs erreicht gemeinsame Meilensteine (z. B. 500 Mal miauen). Jedes erreichte Ziel
gibt ein Abzeichen, manche schalten zusätzlich einen Titel für Byte oder eine Optik im
Katzenzimmer frei. Erreichte Ziele erscheinen mit Datum im Aktivitäts-Feed.

## Entscheidungen

- Freischaltungen: Abzeichen für alle Ziele, Titel für Byte, Optik im Katzenzimmer. Keine
  Sticker und keine neuen Posen (Sticker sind öffentliche Dateien von TheSCraft, neue Posen
  bräuchten neue Zeichnungen).
- Messgrößen: Miauen insgesamt, Aktionen insgesamt, Pfotenpunkte aller Konten,
  Wiederbelebungen.
- Erreichte Ziele werden in einer Tabelle festgehalten (Datum, Feed-Eintrag), nicht nur live
  berechnet.
- Aktionen werden mit einem mitgeführten Zähler `cat.actions` gezählt, nicht per
  `count(*)` über das Protokoll (jeder Abruf würde sonst die ganze Tabelle lesen).
- Öffentlich wie die Ranglisten: abgemeldete Besucher sehen Ziele und Fortschritt.

## Nicht Teil dieses Features

- Zurücksetzen von Zielen, Zähler pro Aktionsart, Nachtragen mit früherem Datum (der
  Zeitpunkt ist der erste Abruf nach dem Überschreiten bzw. nach der Einführung), neue
  Bilder, Änderungen an Spielregeln oder `lib/cat-rules.ts`.

## Ziele

Feste Liste in `lib/goals.ts` (reine Daten, vom Server und vom Client benutzt). Die
Schwellen sind geschätzt für etwa 30 Konten und die aktuellen Cooldowns und an einer Stelle
änderbar.

| Id | Messgröße | Ziel | Abzeichen | Zusätzlich |
|---|---|---|---|---|
| `calls-100` | Miauen | 100 | Erste Miau-Runde | Optik `gold-bowl` (Goldener Napf) |
| `calls-500` | Miauen | 500 | Lautstarker Kurs | Optik `stars` (Sternenhimmel) |
| `calls-2000` | Miauen | 2.000 | Miau-Chor | Optik `sunrise` (Sonnenaufgang) |
| `calls-10000` | Miauen | 10.000 | Legendäres Miau | Optik `glow` (Goldener Schein) |
| `actions-50` | Aktionen | 50 | Fleißiger Kurs | |
| `actions-250` | Aktionen | 250 | Vollzeit-Pfleger | |
| `actions-1000` | Aktionen | 1.000 | Dauerbetreuung | |
| `points-500` | Punkte | 500 | Hörsaal-Stammgast | Titel „Hörsaal-Stammgast“ |
| `points-2500` | Punkte | 2.500 | Dozent h. c. | Titel „Dozent h. c.“ |
| `points-10000` | Punkte | 10.000 | Professor Byte | Titel „Professor Byte“ |
| `revivals-1` | Wiederbelebungen | 1 | Gemeinsam gerettet | |
| `revivals-3` | Wiederbelebungen | 3 | Neun Leben | |

Die Datei exportiert außerdem reine Funktionen:

- `newlyReached(counters, reachedIds)`: Ziele, deren Zähler die Schwelle erreicht hat
  (`>=`) und die noch nicht in `reachedIds` stehen.
- `unlockedTitle(reachedIds)`: Titel des erreichten Ziels mit dem höchsten Titel
  (Reihenfolge `points-10000`, `points-2500`, `points-500`), sonst „Kurskatze“.
- `unlockedEffects(reachedIds)`: Liste der freigeschalteten Optiken.
- `nextGoal(kind, reachedIds)`: das nächste noch nicht erreichte Ziel einer Messgröße oder
  `undefined`, wenn alle erreicht sind.

`counters` hat die Form `{calls, actions, points, revivals}` (Zahlen).

## Datenmodell

- Neue Tabelle `goals_reached(goal text primary key, at integer not null)`.
- Neue Spalte `cat.actions` (integer, not null, Standard 0).
- Neue Spalte `events.detail` (text, nullable): bei Ereignissen vom Typ `goal` die Ziel-Id.
- Migration `0007` mit `drizzle-kit generate` (alle drei Änderungen). Migration `0008` ist
  die Rückfüllung `UPDATE cat SET actions=(SELECT count(*) FROM actions)`, angelegt mit
  `drizzle-kit generate --custom`, damit keine generierte Datei von Hand bearbeitet wird.

## Zählen

- `cat.calls` zählt wie bisher Miauen. `cat.actions` wird im bestehenden `UPDATE cat` der
  Aktion hochgezählt: in `lib/server/actions/interact.ts` wird dort
  `calls=calls+? WHERE id=1 AND changes()>0` zu
  `calls=calls+?,actions=actions+1 WHERE id=1 AND changes()>0` (kein zusätzlicher Parameter,
  alles andere bleibt wortgleich).
- Punkte: Summe von `players.points` über die Konten mit Passwort (wie die Gesamtrangliste).
- Wiederbelebungen: Anzahl der Feed-Einträge vom Typ `revived`.

## Erkennen

`state()` (`lib/server/state.ts`) liest im bestehenden Batch zusätzlich: `cat.actions` (in
der vorhandenen `cat`-Abfrage), die Punktesumme, die Zahl der `revived`-Einträge und alle
Zeilen aus `goals_reached`. Dann bestimmt `newlyReached` in JavaScript, welche Ziele neu
erreicht sind. Nur wenn es welche gibt, läuft ein zweiter Batch: pro Ziel
`INSERT OR IGNORE INTO goals_reached(goal,at) VALUES(?,?)` und
`INSERT OR IGNORE INTO events(key,type,player,at,detail) VALUES(?,'goal',NULL,?,?)` mit
Schlüssel `goal:<id>`, `at = now`, `detail = <id>`, danach liest derselbe Batch
`goals_reached` und die Feed-Einträge erneut, damit die Antwort sie schon enthält.
Gleichzeitige Abrufe erzeugen wegen der eindeutigen Schlüssel nichts doppelt. Weil `state()`
auch die Antwort jeder Aktion liefert, wird ein Ziel meist im Moment des Überschreitens
eingetragen.

## API

`state()` liefert ein neues Feld `goals`:
`{counters: {calls, actions, points, revivals}, reached: {<zielId>: <zeitpunkt>}}`.
Der Typ `FeedEvent` bekommt `detail: string | null` und den Typ `"goal"`; die
Feed-Abfrage liefert `e.detail AS detail`. `Data` bekommt `goals`.

## Oberfläche

- `components/cat/GoalsCard.tsx`: Karte „Kursziele“ im Katzenzimmer in der rechten Spalte
  unter „Letzte Ereignisse“. Pro Messgröße das nächste Ziel mit Balken
  („Miauen 312 / 500“), oder „Alles geschafft“, wenn alle Ziele einer Messgröße erreicht
  sind. Darunter „Abzeichen 5 von 12“ mit einer Reihe kleiner Icons: erreichte farbig, offene
  grau, mit Titel als Beschriftung und bei erreichten mit Datum. Lade-Zustand, wenn `goals`
  noch fehlt.
- Titel: Das Schildchen neben „Das ist Byte.“ in `app/page.tsx` (bisher fest `KURSKATZE`)
  zeigt `unlockedTitle(...)` in Großbuchstaben.
- Optik: `CatStage` bekommt die Prop `effects: string[]` und setzt pro Eintrag die Klasse
  `fx-<name>` auf `.stage`. Die Effekte sind reines CSS in der neuen Datei
  `styles/goals.css`, die in `app/globals.css` als letzte Zeile importiert wird: `gold-bowl`
  färbt den Napf (`.bowl`), `stars` legt einen leise funkelnden Sternenhimmel auf die Bühne,
  `sunrise` einen warmen Verlauf, `glow` einen goldenen Schein um die Katze (der bestehende
  `drop-shadow` von `.cat` bleibt erhalten). Keine Layoutänderung, keine Animation unter
  `prefers-reduced-motion`.
- Feed: `ActivityCard` zeigt für `goal` „Kursziel erreicht: <Abzeichen>“ (Abzeichenname aus
  `lib/goals.ts` über `detail`; unbekannte Id: „Kursziel erreicht“).

## Tests

Vitest über die echte Route (`tests/`), `goals_reached` kommt in die Aufräumliste von
`tests/setup.ts`.

- `lib/goals.ts`: `newlyReached` an den Grenzen (99 gegen 100, genau auf der Schwelle,
  bereits erreichte Ziele ausgeschlossen), `unlockedTitle` (höchster Titel, Rückfall
  „Kurskatze“), `unlockedEffects`, `nextGoal`.
- Zähler: Jede angenommene Aktion erhöht `cat.actions` um 1, eine abgelehnte nicht; Miauen
  erhöht `cat.calls`.
- Erkennen: `calls` knapp unter die Schwelle setzen (direkt in der Datenbank), dann eine
  echte Miau-Aktion: `goals.reached` enthält das Ziel mit `at`, der Feed genau einen
  `goal`-Eintrag mit `detail`; wiederholte und gleichzeitige Abrufe erzeugen keinen zweiten.
  Je ein Fall für Punkte und für Wiederbelebung (echter Wiederbelebungs-Ablauf).
- Rückfüllung: Die SQL-Datei der Migration `0008` wird gegen eine Datenbank mit
  Protokollzeilen und `cat.actions=0` ausgeführt, danach entspricht `cat.actions` der
  Zeilenzahl.
- Die Karte, die Balken, der Titel und die vier Optiken werden per Sichtprüfung im Browser
  geprüft, nicht automatisch.

## Rollout

- Lokal: Migrationen `0007` und `0008` einzeln und der Reihe nach auf eine bestehende
  Datenbank einspielen (README ergänzen). Ohne sie antwortet `GET /api/cat` mit 500
  (`no such table: goals_reached` bzw. `no such column`). `0008` schreibt einen abgeleiteten
  Zähler in die Zeile `cat`.
- Ein Hosting gibt es noch nicht. Beim Einrichten müssen die Migrationen `0000` bis `0008`
  der Reihe nach laufen.

## Risiken

- `state()` schreibt jetzt zusätzlich bei erreichten Zielen (idempotent, selten).
- Die Änderung am `UPDATE cat` in `interact.ts` ist klein, liegt aber in einem Kernstatement.
  Bestehende Tests über Aktionen sichern es ab.
- Konflikte mit paralleler Arbeit sind wahrscheinlich in `interact.ts`, `state.ts`,
  `cat-types.ts`, `page.tsx`, `ActivityCard.tsx` und `db/schema.ts`. „Zuneigung mit Folgen“
  wird erst nach diesem Feature umgesetzt.
