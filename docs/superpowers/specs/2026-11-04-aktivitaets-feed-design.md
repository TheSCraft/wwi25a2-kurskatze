# Aktivitäts-Feed (Teil 2, Feature 1)

Datum: 2026-11-04
Status: im Gespräch freigegeben, Umsetzungsplan folgt

## Ziel

Im Katzenzimmer zeigt eine Karte „Letzte Ereignisse“, was im Kurs zuletzt mit Byte
passiert ist: Beitritte, Portionen der gemeinsamen Futterrunde, die Wiederbelebung und
Bytes Tod. Der Feed ist außerdem die Grundlage für die weiteren geplanten Features
(Wochen-Rangliste, Kurs-Ziele).

## Entscheidungen

- Ereignisse: `joined`, `revive_portion`, `revived`, `died`. Die sechs normalen Aktionen
  erscheinen bewusst **nicht** im Feed.
- Anzeige: eine Karte in der rechten Spalte des Katzenzimmers unter dem Score, die letzten
  10 Ereignisse, neueste zuerst. Kein eigener Tab.
- Speicherung: eigene Tabelle `events`, Einträge werden im selben atomaren D1-Batch wie die
  eigentliche Änderung geschrieben. Der Name wird beim Lesen aus `players` verknüpft, nicht
  gespeichert.
- Der Feed ist öffentlich (auch ohne Anmeldung), wie die Rangliste. Es erscheinen nur
  Spitznamen.

## Nicht Teil dieses Features

- Die sechs Aktionen im Feed.
- Nachtragen von Ereignissen für bestehende Konten (der Feed beginnt leer).
- Löschen alter Einträge, Paging, eigener Tab, Live-Push ohne Polling.
- Änderungen an der Spielbalance oder an den Regeln aus `lib/cat-rules.ts`.

## Datenmodell

Neue Tabelle `events` (Drizzle-Schema in `db/schema.ts`, Migration `0005_*.sql` mit
`drizzle-kit generate`, keine handgeschriebene Migration):

| Spalte | Typ | Bedeutung |
|---|---|---|
| `id` | integer, Primärschlüssel, fortlaufend | Reihenfolge bei gleicher Zeit |
| `key` | text, not null, **unique** | verhindert Doppeleinträge |
| `type` | text, not null | `joined`, `revive_portion`, `revived`, `died` |
| `player` | text, nullable | Spieler-ID, leer bei `died` und `revived` |
| `at` | integer, not null | Zeitpunkt in Millisekunden |

Schlüssel: `joined:<player>`, `revive_portion:<runde>:<player>`, `revived:<runde>`,
`died:<runde>`; `<runde>` ist der Wert von `cat.food_expires` der betroffenen Runde. Es wird
immer mit `INSERT OR IGNORE` geschrieben. Index auf `(at, id)` für die Abfrage der letzten
Einträge.

## Schreiben der Ereignisse

Jeweils im selben Batch (D1-Batches sind eine Transaktion) wie die Änderung:

- **Registrieren** (`lib/server/actions/account.ts`, `handleCredentials`, Fall `register`):
  Eintrag `joined` mit `at = now` im bestehenden Registrierungs-Batch. Schlägt der Batch
  fehl (z. B. vergebener Spitzname), wird er zurückgerollt, es entsteht kein Eintrag.
- **Portion füttern** (`lib/server/actions/revive.ts`): Eintrag `revive_portion` mit
  `at = now`, nur wenn das Konto in dieser Runde als gefüttert gezählt wird
  (`accounts.fed_round = <runde>` für dieses Konto). Eine abgelehnte zweite Portion erzeugt
  keinen Eintrag. Die Anweisung steht **hinter** den bestehenden zwei Anweisungen, damit die
  `changes()>0`-Bedingung der Wiederbelebungs-Anweisung weiter auf die Stimme verweist.
- **Byte wieder da** (`revive.ts`): Eintrag `revived` mit `at = now`, wenn nach dem Update
  `cat.food_expires = now + foodLifetime` gilt, also nur wenn dieser Batch die
  Wiederbelebung ausgelöst hat.
- **Byte ist gestorben** (`lib/server/state.ts`): Als erste Anweisung im Batch von `state()`
  `INSERT OR IGNORE` von `died:<food_expires>` mit `at = food_expires` (tatsächliche
  Todeszeit), wenn `food_expires <= now`. Nachträgliches Erkennen beim nächsten Abruf, kein
  Zeitgeber. Gleichzeitige Abrufe erzeugen wegen des eindeutigen Schlüssels keinen
  Doppeleintrag.

## API

`state()` liefert ein neues Feld `events`: die letzten 10 Ereignisse, neueste zuerst
(`ORDER BY at DESC, id DESC LIMIT 10`), je `{type, at, name}`. Der Name kommt per
`LEFT JOIN players` (aktueller Spitzname). Die Abfrage ist eine weitere Anweisung im
bestehenden Batch, also kein zusätzlicher Aufruf. Der Typ `Data` in `lib/cat-types.ts` wird
um `events` erweitert. Das bestehende 8-Sekunden-Polling aktualisiert den Feed.

## Oberfläche

- `components/cat/ActivityCard.tsx`: Karte „Letzte Ereignisse“ mit geordneter Liste, Props
  `{events: Data["events"]; now: number}` (`now` ist die mit dem Server abgeglichene Uhr).
  Eingebunden in `app/page.tsx` in der rechten Spalte unter `ScoreCard`.
- Texte: `joined` „<Name> ist dem Kurs beigetreten“, `revive_portion` „<Name> hat eine
  Portion in den Napf gelegt“, `revived` „Byte ist wieder da“, `died` „Byte ist gestorben“.
  Fehlt der Name: „Jemand“.
- Relative Zeit durch `relativeTime(at, now)` in `lib/format-time.ts`: „gerade eben“ (unter
  1 Minute), „vor N Min.“, „vor N Std.“, „vor N Tagen“ (Singular „vor 1 Tag“).
- Leerer Zustand: „Noch nichts passiert. Hier erscheinen Beitritte und Wiederbelebungen.“
- Stil in neuer Datei `styles/activity.css`, in `app/globals.css` als **letzte** Zeile
  importiert (Reihenfolge der Kaskade bleibt erhalten). Kartenoptik wie die anderen Karten.

## Tests

Vitest über die echte Route (`tests/`), die Migration wird von `tests/setup.ts` über die
`drizzle/*.sql`-Glob automatisch eingespielt. `events` muss in der Aufräumliste von
`tests/setup.ts` stehen.

- Registrieren schreibt genau einen `joined`; eine fehlgeschlagene Registrierung keinen.
- Eine Portion schreibt `revive_portion`; die zweite Portion desselben Kontos keinen
  weiteren Eintrag.
- Die letzte Portion schreibt `revived`.
- `died` wird beim Abruf genau einmal eingetragen (auch bei mehreren gleichzeitigen
  Abrufen), `at` ist `food_expires`.
- Reihenfolge neueste zuerst, höchstens 10 Einträge, Umbenennen zeigt den neuen Namen.
- Abgemeldete Abrufe enthalten `events` ebenfalls.
- `relativeTime`: Grenzen (59 s, 60 s, 59 min, 60 min, 23 h, 24 h) und Singular/Plural.
- Die Karte wird per Sichtprüfung im Browser geprüft, nicht automatisch.

## Rollout

- Lokal: README ergänzen, dass für eine **bestehende** Datenbank nur die neue Migration
  eingespielt wird (die Schleife über alle Migrationen gilt nur für eine leere Datenbank).
- Produktion: Wie das Hosting Migrationen einspielt, ist von hier nicht sichtbar und muss
  vor dem Deploy mit dem Repo-Eigentümer (TheSCraft) geklärt werden.

## Risiken

- `state()` schreibt jetzt (nur `died`); `initialize()` schreibt schon heute beim Lesen.
- Bestehende Tests, die genau drei oder vier Tabellen leeren oder `state()`-Felder exakt
  vergleichen, müssen um `events` ergänzt werden.
- Konflikte mit paralleler Arbeit von TheSCraft sind unwahrscheinlich (überwiegend neue
  Dateien); berührt werden `db/schema.ts`, `state.ts`, `account.ts`, `revive.ts`,
  `cat-types.ts`, `page.tsx`, `globals.css`.
