# Wochen-Rangliste (Teil 2, Feature 2)

Datum: 2026-11-04
Status: im Gespräch freigegeben, Umsetzungsplan folgt

## Ziel

Im Tab „Rangliste“ gibt es zusätzlich zur Gesamtwertung eine Wertung für die laufende
Woche. Die Woche beginnt jeden Montag um 0 Uhr deutscher Zeit (Europe/Berlin). Bisher
werden Punkte nur als laufende Summe in `players.points` gespeichert, ein Verlauf fehlt.

## Entscheidungen

- Anzeige: Reiter „Diese Woche“ (Standard) und „Gesamt“ im Tab „Rangliste“. Die Karte
  „Dein Score“ im Katzenzimmer bleibt unverändert.
- Woche: Montag 00:00 bis Sonntag 24:00 in Europe/Berlin, mit Sommer-/Winterzeit.
- Vergangene Wochen: werden gespeichert, aber nicht angezeigt.
- Speicherung: Aktionsprotokoll (Tabelle `actions`), im selben atomaren D1-Batch wie die
  Punkte geschrieben. Die Wochenwertung ist eine Summenabfrage seit Wochenbeginn.
- Öffentlich wie die Gesamtwertung (auch abgemeldet), nur Spitznamen und Punkte.

## Nicht Teil dieses Features

- Nachtragen alter Punkte: Der Verlauf beginnt mit der Migration, die Gesamtwertung
  (`players.points`) bleibt unverändert.
- Löschen oder Zusammenfassen alter Zeilen, Anzeige vergangener Wochen, Wochensieger,
  Hervorheben der eigenen Zeile.
- Änderungen an der Spielbalance oder an `lib/cat-rules.ts`.

## Datenmodell

Neue Tabelle `actions` (Drizzle-Schema in `db/schema.ts`, Migration `0006_*.sql` mit
`drizzle-kit generate`, keine handgeschriebene Migration):

| Spalte | Typ | Bedeutung |
|---|---|---|
| `id` | integer, Primärschlüssel, fortlaufend | Reihenfolge |
| `player` | text, not null | Spieler-ID |
| `action` | text, not null | `food`, `love`, `meow`, `play`, `brush`, `study` |
| `points` | integer, not null | vergebene Pfotenpunkte |
| `at` | integer, not null | Zeitpunkt in Millisekunden |

Indizes: `actions_at_idx` auf `(at)` und `actions_player_at_idx` auf `(player, at)`.

## Schreiben

In `lib/server/actions/interact.ts` kommt hinter die bestehenden drei Batch-Anweisungen eine
vierte: `INSERT INTO actions(player,action,points,at) SELECT ?,?,?,? WHERE changes()>0`
mit `who.player`, `action`, `rule.points`, `now`. Sie steht direkt hinter dem Update der
Katze, das nur läuft, wenn die Aktion angenommen wurde (`changes()>0` bezieht sich dort auf
die Punkte-Aktualisierung), und liefert danach 1 geänderte Zeile genau dann, wenn die
Aktion angenommen wurde. Abgelehnte Aktionen (Cooldown, gemeinsame Pause, tote Katze)
schreiben nichts. Die bestehenden drei Anweisungen bleiben wortgleich und in ihrer
Reihenfolge, das Ergebnis `accepted` bleibt das erste Batch-Ergebnis.

## Die Woche

Neue Datei `lib/week.ts` mit zwei reinen Funktionen:

- `weekStart(now: number): number` liefert den Zeitpunkt „Montag 00:00 Uhr in
  Europe/Berlin“ der Woche von `now` in Millisekunden.
- `nextWeekStart(now: number): number` liefert den Beginn der folgenden Woche
  (`weekStart(weekStart(now) + 7 Tage + 12 Stunden)`).

Berechnung mit `Intl.DateTimeFormat` (`en-GB`, `timeZone: "Europe/Berlin"`,
`hourCycle: "h23"`): Wochentag und Kalenderdatum in Berlin bestimmen, auf den Montag
zurückrechnen, die lokale Mitternacht über den Offset von Berlin in UTC umrechnen. Die
Zeitumstellung liegt immer in der Nacht zu Sonntag, der Offset am Montag ist eindeutig.

## API

`state()` (`lib/server/state.ts`) liefert drei neue Felder:

- `weekBoard`: Einträge `{name, points}` (Form wie `board`), die Summe der Punkte seit
  `weekStart(now)`, nur Konten mit Passwort (wie `board`), absteigend nach Punkten, bei
  Gleichstand nach dem früheren letzten Zeitpunkt (`max(at)` aufsteigend), höchstens 100.
- `weekStart` und `weekEnd` in Millisekunden (`weekEnd = nextWeekStart(now)`).

Die Abfrage ist eine weitere Anweisung im bestehenden Batch (kein zusätzlicher Aufruf).
Der Typ `Data` in `lib/cat-types.ts` wird um `weekBoard: Entry[]`, `weekStart: number` und
`weekEnd: number` erweitert. Das 8-Sekunden-Polling aktualisiert die Wertung.

Abfrage: `SELECT p.name AS name, sum(a.points) AS points FROM actions a JOIN players p ON
p.id=a.player JOIN accounts ac ON ac.player=p.id WHERE ac.password IS NOT NULL AND a.at>=?
GROUP BY +a.player ORDER BY sum(a.points) DESC, max(a.at) ASC LIMIT 100` mit `weekStart(now)`.
Das unäre Plus hält den Planer beim Index auf `at`, sonst durchsucht er die gesamte Historie.

## Oberfläche

- `components/cat/Leaderboard.tsx` bekommt zusätzlich die Prop `now` (von `app/page.tsx`
  durchgereicht) und zwei Reiter („Diese Woche“, „Gesamt“) als Reiterleiste
  (`role="tablist"`, `role="tab"`, `aria-selected`, Pfeiltasten wechseln den Reiter). Der
  gewählte Reiter ist lokaler Zustand der Komponente, Standard ist „Diese Woche“.
- Dieselbe Liste für beide Reiter, nur die Daten wechseln (`weekBoard` bzw. `board`).
- Unter „Diese Woche“ steht: „Punkte seit Montag, 0 Uhr. Neue Woche <restzeit>.“ mit
  `remainingTime(weekEnd, now)` aus `lib/format-time.ts` („in 5 Min.“, „in 3 Std.“,
  „in 1 Tag“, „in 2 Tagen“, unter 1 Minute oder abgelaufen: „gleich“). Unter „Gesamt“
  bleibt der bisherige Text (Punkte je Aktion).
- Leere Wochenliste: „Diese Woche hat noch niemand Punkte gesammelt. Wer gibt Byte den
  ersten Snack?“ Leere Gesamtliste und Ladezustand („Rangliste lädt …“) bleiben wie bisher.
- Stil in neuer Datei `styles/weekly.css`, in `app/globals.css` als letzte Zeile importiert
  (Reihenfolge der Kaskade bleibt erhalten).

## Tests

Vitest über die echte Route (`tests/`), die Migration wird von `tests/setup.ts` über die
`drizzle/*.sql`-Glob eingespielt; `actions` kommt in die Aufräumliste.

- Eine angenommene Aktion schreibt genau eine Zeile (Aktion, Punkte, Zeitpunkt); eine
  abgelehnte Aktion (Cooldown, gemeinsame Pause, tote Katze) keine.
- `weekBoard`: summiert nur Punkte seit Wochenbeginn, Sortierung inklusive Gleichstand,
  nur Konten mit Passwort, höchstens 100, auch abgemeldet sichtbar, nach dem Wochenwechsel
  (Zeit auf Montag 0 Uhr Berlin) bei null, während `board` bleibt.
- Gesamt und Woche laufen nicht auseinander: in derselben Woche steigen `players.points`
  und die Wochensumme um denselben Betrag.
- `weekStart`/`nextWeekStart`: feste Zeitpunkte, darunter die Umstellungswochen 2026
  (29.03. Sommerzeit, 25.10. Winterzeit), Sonntag 23:59:59 gegen Montag 00:00:00 und
  Wochenmitte. Referenzwerte (UTC): 2026-11-04T09:00Z gibt 2026-11-01T23:00Z, nächste Woche
  2026-11-08T23:00Z; 2026-07-15T12:00Z gibt 2026-07-12T22:00Z; 2026-03-29T12:00Z gibt
  2026-03-22T23:00Z, nächste Woche 2026-03-29T22:00Z; 2026-10-25T12:00Z gibt
  2026-10-18T22:00Z, nächste Woche 2026-10-25T23:00Z.
- `remainingTime`: Grenzen und Einzahl/Mehrzahl.
- Die Reiter werden per Sichtprüfung im Browser geprüft, nicht automatisch.

## Rollout

- Lokal: README ergänzen, dass für eine **bestehende** Datenbank nur die neue Migration
  eingespielt wird. Ohne sie antwortet `GET /api/cat` mit 500 (`no such table: actions`).
- Ein Hosting gibt es noch nicht. Beim Einrichten müssen die Migrationen `0000` bis `0006`
  in dieser Reihenfolge eingespielt werden.
- Datenmenge: Pro angenommener Aktion eine Zeile. Im Extremfall (Miauen alle 15 Minuten)
  etwa 100 Zeilen pro Konto und Tag, realistisch deutlich weniger; die Wochenabfrage liest
  nur Zeilen der laufenden Woche über den Index auf `at`.
- Die Abfrage läuft bei jedem `state()`-Aufruf, und jeder Client fragt alle 8 Sekunden an. Bei einem
  Hosting mit Abrechnung nach gelesenen Zeilen sollte man dann Caching oder einen vorberechneten
  Wochenzähler erwägen.

## Risiken

- Bestehende Tests, die `state()`-Felder exakt vergleichen, müssen um die neuen Felder
  ergänzt werden.
- Die Annahme `changes()>0` für die vierte Anweisung stützt sich auf die Reihenfolge im
  Batch; ein Test mit abgelehnter Aktion sichert sie ab.
- Konflikte mit paralleler Arbeit von TheSCraft sind wahrscheinlich in `Leaderboard.tsx`,
  `state.ts`, `interact.ts`, `cat-types.ts` und `page.tsx`.
