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

Löschen von `.wrangler/` setzt die lokale Datenbank zurück, dann ist dieser Schritt zu wiederholen.

## Tests

    pnpm test

Vitest mit `@cloudflare/vitest-pool-workers`: Die Tests laufen in der Workers-Laufzeit mit einer
frischen lokalen D1 und prüfen Konto, Aktionen, Cooldowns, Wiederbelebung und gleichzeitige
Anfragen. Sie brauchen den Dev-Server und die Schritte oben nicht.

## Aufbau

- `app/page.tsx`: Seite, setzt Hooks und Komponenten zusammen
- `app/api/cat/route.ts`: Routing der API
- `components/cat/`: UI-Bausteine (Bühne, Napf, Aktionen, Konto, Rangliste, Wiederbelebung, Sticker)
- `hooks/use-cat.ts`, `hooks/use-reaction.ts`: Abruf, Uhr, Session und Reaktionen
- `lib/server/`: Datenbank, Anmeldung, Zustand und Aktionen (`actions/`)
- `lib/cat-rules.ts`: Punkte, Cooldowns, Wirkungen
- `lib/cat-types.ts`: gemeinsame Typen
- `lib/sound.ts`: Töne
- `styles/`: CSS, aufgeteilt in neun Dateien
- `drizzle/`, `db/`: Migrationen und Schema
- `tests/`: Vitest
