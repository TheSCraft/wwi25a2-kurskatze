# Fundament: Aufräumen und Tests (Teil 1)

Datum: 2026-11-03
Status: freigegeben im Gespräch, Umsetzungsplan folgt

## Ziel

Die Kurskatze (Byte) soll wartbar werden, bevor neue Features dazukommen.
`app/page.tsx` (62 Zeilen) und `app/api/cat/route.ts` (102 Zeilen) sind sehr dicht
geschrieben, `app/globals.css` ist eine einzige Zeile mit 9 KB, und es gibt keine
Tests. Das Verhalten der App bleibt unverändert. Das ist ein reiner Umbau.

## Nicht Teil dieses Umbaus

- Neue Features (siehe Ausblick).
- Umstellung der SQL-Strings auf Drizzle-Queries. Die atomaren D1-Batches mit
  `changes()` bleiben wörtlich gleich.
- Der Starter-Code unter `scripts/`, `vendor/`, `worker/`, `examples/` und das
  ungenutzte shadcn-Set in `components/ui/`.

## Zielstruktur

```
app/
  page.tsx                 Tab-Zustand und Zusammenbau
  api/cat/route.ts         nur GET/POST-Routing
components/cat/
  CatStage  ActionPanel  RevivalPanel  StatusCard  ScoreCard
  Leaderboard  StickerBox  AccountDialog  Bowl
hooks/
  use-cat.ts               Polling, Uhr (Server-Zeit-Offset), Session-Header, Revision-Zähler, send()
  use-reaction.ts          Sprechblase und Pose mit 3,5-s-Timer
lib/
  cat-rules.ts             bleibt
  cat-types.ts             Data, Entry, Tab
  server/
    db.ts  auth.ts  state.ts  initialize.ts
    actions/  account.ts  revive.ts  interact.ts
styles/
  base.css  header.css  stage.css  cards.css  stickers.css  dialog.css
  animations.css  responsive.css  additions.css
app/globals.css            importiert die Teildateien
```

Es sind neun statt sechs CSS-Dateien (Import-Reihenfolge wie in `app/globals.css`). Die drei
zusätzlichen (`animations`, `responsive`, `additions`) gibt es, weil im Original `@keyframes`,
`@media` und spätere Regeln verteilt dazwischenliegen und die Kaskadenreihenfolge erhalten
bleiben muss.

Variablen bekommen lesbare Namen. Texte, `phrases`, Klassennamen und Selektoren
bleiben unverändert.

## Tests

- Vitest mit `@cloudflare/vitest-pool-workers`: Tests laufen im Worker-Laufzeitmodell
  mit frischer lokaler D1. Die Migrationen aus `drizzle/` werden vor jedem Test
  eingespielt.
- Alle Tests laufen über die Route mit echten `Request`-Objekten, sodass sie den
  Umbau unverändert überstehen. Die Zeit ist kontrollierbar.
- Abgedeckt: Aktionen (Punkte, Cooldown, gemeinsame Pause, Lebensfrist, Deckel bei
  Zuneigung), Tod, Wiederbelebung (Teilnehmerkreis, Doppelportion, letzte Portion,
  Neuregistrierung während der Runde), Konto (Registrieren, Login, falsches Passwort,
  Rate-Limit nach 12 Versuchen, doppelter Spitzname, Umbenennen), Rennen
  (zwei gleichzeitige Aktionen: nur eine wird akzeptiert).
- Keine UI-Komponententests. Die UI wird per Screenshots und manuellem
  Durchklicken geprüft.
- Die Tests werden zuerst gegen den unveränderten Code geschrieben und müssen grün
  sein, bevor aufgeteilt wird.

## Ablauf

1. Vitest und Workers-Pool installieren (Download, vorher beim Nutzer nachfragen).
2. Tests gegen den unveränderten Code schreiben.
3. Server-Seite in `lib/server/` aufteilen.
4. `page.tsx` in Komponenten und Hooks zerlegen (vorher Screenshots).
5. CSS aufteilen, Screenshots vergleichen, von Hand durchklicken.
6. README und `npm test` ergänzen.

Commits nur auf Wunsch des Nutzers, dann ein Commit pro Schritt.

## Risiken

- Race-Conditions in den D1-Batches: durch die Tests aus Schritt 2 abgesichert.
- Unbemerkte UI-Änderungen: Screenshots vorher und nachher, manueller Durchlauf.
- Node-Version: Das Projekt braucht Node 22, auf dem Rechner läuft 20. Es wird ein
  temporäres Node 22 verwendet.

## Ausblick: Teil 2 (eigene Mini-Designs)

1. Aktivitäts-Feed (neue Tabelle `events`, Grundlage für die weiteren Features).
2. Wochen-Rangliste.
3. Kurs-Ziele und Freischaltungen.
4. Zuneigung mit Folgen.
