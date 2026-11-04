# Miau Campus · Kurskatze WWI25A2

Eine Web-App, in der der ganze Kurs gemeinsam die virtuelle Katze **Byte** versorgt: füttern,
streicheln, bürsten, spielen, lernen und miauen bringt Pfotenpunkte. Wird Byte 72 Stunden nicht
gefüttert, stirbt er. Danach muss jedes Kurskonto eine Portion füttern, damit er wieder lebt.

## Starten

Voraussetzung: Node `>=22.13.0`. Das Projekt nutzt pnpm (`packageManager` in `package.json`,
`pnpm-lock.yaml`). Abhängigkeiten mit `corepack pnpm install` (oder `pnpm install`) installieren,
nicht mit `npm install`, das die Lockdatei ignoriert. Danach:

    pnpm dev

Der Dev-Server läuft auf `http://127.0.0.1:5173`. Die lokale Datenbank (Cloudflare D1 über
Miniflare) liegt unter `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite`.

### Datenbank einrichten (einmalig)

Der Dev-Server legt die Tabellen nicht selbst an. Solange die Migrationen fehlen, antwortet
`GET /api/cat` mit 500 und `no such table: cat`. So werden sie eingespielt:

1. `pnpm dev` starten und einmal die Seite aufrufen. Erst dabei entsteht die `.sqlite`-Datei.
2. Die Migrationen aus `drizzle/` der Reihe nach in diese Datei schreiben (das `sqlite3`-CLI wird
   vorausgesetzt):

       for f in drizzle/000*.sql; do
         sed 's/--> statement-breakpoint//' "$f" | sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite
       done

   `<hash>` ist der Dateiname der vorhandenen `.sqlite`-Datei (nicht `metadata.sqlite`).

Die Schleife über alle `drizzle/000*.sql` gilt nur für eine **leere** Datenbank. Bei einer
**bestehenden** lokalen Datenbank wird nach einem Update nur die neue Migration eingespielt, zum
Beispiel:

    sed 's/--> statement-breakpoint//' drizzle/0005_glorious_nighthawk.sql | sqlite3 <.sqlite-Datei>

Ohne diese Migration antwortet `GET /api/cat` mit 500 und `no such table: events`.

Mit der Wochen-Rangliste kommt eine weitere Migration, `drizzle/0006_silly_whirlwind.sql`. Auf
eine **bestehende** lokale Datenbank wird sie wie die vorherige einzeln eingespielt. Ohne sie
antwortet `GET /api/cat` mit 500 und `no such table: actions`. Beim späteren Einrichten eines
Hostings müssen die Migrationen `0000` bis `0006` der Reihe nach laufen.

Mit den Kurszielen kommen zwei weitere Migrationen, `drizzle/0007_hard_manta.sql` und
`drizzle/0008_backfill_actions_counter.sql`. Auf eine **bestehende** lokale Datenbank werden sie
wie die vorherigen einzeln und **der Reihe nach** eingespielt. `0008` füllt den neuen Zähler
`cat.actions` aus dem Protokoll. Ohne sie antwortet `GET /api/cat` mit 500 und
`no such table: goals_reached` bzw. `no such column`. Beim späteren Einrichten eines Hostings
müssen die Migrationen `0000` bis `0008` der Reihe nach laufen.

Löschen von `.wrangler/` setzt die lokale Datenbank zurück, dann ist dieser Schritt zu wiederholen.

## Tests

    pnpm test

Vitest mit `@cloudflare/vitest-plugin`: Die Tests laufen in der Workers-Laufzeit mit einer
frischen lokalen D1 und prüfen Konto, Aktionen, Cooldowns, Wiederbelebung und gleichzeitige
Anfragen. Sie brauchen den Dev-Server und die Schritte oben nicht.

## Aufbau

- `app/page.tsx`: Seite, setzt Hooks und Komponenten zusammen
- `app/api/cat/route.ts`: Routing der API
- `components/cat/`: UI-Bausteine (Bühne, Napf, Aktionen, Konto, Rangliste, Wiederbelebung)
- `components/stickerbox.tsx`: Stickerbox (Katalog aus `public/stickerbox/katalog.json`, Suche, Themenpakete)
- `hooks/use-cat.ts`, `hooks/use-reaction.ts`, `hooks/use-sound.ts`: Abruf, Uhr, Session, Reaktionen und Ton
- `lib/server/`: Datenbank, Anmeldung, Zustand und Aktionen (`actions/`)
- `lib/cat-rules.ts`: Punkte, Cooldowns, Wirkungen, Teamgröße (`minimumTeamSize`, `actionGain`)
- `lib/cat-types.ts`: gemeinsame Typen
- `lib/meow-sound.ts`: Miau-Sound
- `lib/sticker-*.ts`, `scripts/build-stickers.mjs`: Sticker-Motive, werden bei `dev`/`build` nach `public/stickerbox/` gerendert
- `styles/`: CSS, aufgeteilt in zehn Dateien
- `drizzle/`, `db/`: Migrationen und Schema
- `tests/`: Vitest
