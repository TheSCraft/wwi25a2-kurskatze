# Fundament (Aufräumen und Tests) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Kurskatze-App wartbar machen (Server und Client in Module aufteilen, CSS lesbar machen) und die kritische Spiellogik mit Tests absichern, ohne das Verhalten zu ändern.

**Architecture:** Zuerst Charakterisierungstests gegen den unveränderten Server-Code (Vitest im Cloudflare-Workers-Pool mit lokaler D1). Danach wird `route.ts` wortgleich in `lib/server/*` verschoben, `page.tsx` in Hooks und Komponenten zerlegt und das CSS formatiert und auf Dateien verteilt. Die Tests laufen nach jedem Schritt.

**Tech Stack:** Next 16 / vinext, React 19, Cloudflare Workers + D1, Vitest 4 mit `@cloudflare/vitest-pool-workers` 0.23.

**Spec:** `docs/superpowers/specs/2026-11-03-fundament-design.md`

## Global Constraints

- Verhalten, Texte (`phrases`, Fehlermeldungen), Klassennamen, Selektoren und alle SQL-Strings bleiben wörtlich gleich. Es wird nur verschoben, benannt und formatiert.
- Node `>=22.13.0` ist nötig. Auf dem Entwicklerrechner läuft Node 20, deshalb jedes Kommando mit `PATH=<scratchpad>/node22/node_modules/node/bin:$PATH` vorstellen, falls `node -v` kleiner als 22 ausgibt.
- Das Installieren neuer Pakete (Task 1) ist ein Download: **vorher den Nutzer fragen.**
- Commits nur, wenn der Nutzer es erlaubt hat. Die Commit-Schritte unten gelten dann, sonst überspringen.
- Nicht anfassen: `scripts/`, `vendor/`, `worker/`, `examples/`, `components/ui/`, `drizzle/` (außer Lesen).
- `components/connector-error.tsx`, `app/chatgpt-auth.ts` und `lib/connector-*` gehören zum Starter und bleiben unverändert.
- Gefundene echte Fehler werden getrennt behandelt: erst einen fehlschlagenden Test schreiben, dann in einem eigenen Commit beheben (siehe Task 2, Schritt 6).

## File Structure

```
vitest.config.ts                     Vitest-Konfiguration (Workers-Pool, D1-Binding DB)
tests/setup.ts                       Migrationen einspielen, Tabellen leeren
tests/helpers.ts                     get/post/register/Zeit-Helfer
tests/account.test.ts  tests/interact.test.ts  tests/revive.test.ts  tests/race.test.ts
lib/cat-types.ts                     Data, Entry, Tab, isDead
lib/server/db.ts                     db, sql, secret, digest, passwordHash, loginKey, roster, unit, month
lib/server/http.ts                   response, Body
lib/server/auth.ts                   identity, Identity
lib/server/initialize.ts             initialize
lib/server/state.ts                  state
lib/server/actions/account.ts        handleLogout, handleCredentials, handleRename
lib/server/actions/revive.ts         handleRevive
lib/server/actions/interact.ts       handleInteract
app/api/cat/route.ts                 nur Routing
hooks/use-cat.ts                     Polling, Uhr, Session, send()
hooks/use-reaction.ts                Sprechblase und Pose
components/cat/*.tsx                 siehe Task 4
styles/*.css                         siehe Task 5
```

---

### Task 1: Test-Infrastruktur

**Files:**
- Modify: `package.json` (devDependencies, Skript `test`)
- Create: `vitest.config.ts`, `tests/setup.ts`, `tests/helpers.ts`, `tests/smoke.test.ts`

**Interfaces:**
- Produces (`tests/helpers.ts`): `T0: number`, `setTime(ms:number): void`, `get(session?:string): Promise<Response>`, `post(body:object, session?:string, headers?:Record<string,string>): Promise<Response>`, `register(name:string, password?:string): Promise<{res:Response; body:any; session:string}>`, `act(session:string, action:string): Promise<Response>`.

- [ ] **Step 1: Nutzer um Erlaubnis für den Download fragen**

Frage: „Ich installiere `vitest@^4.1` und `@cloudflare/vitest-pool-workers` als devDependencies (npm-Download, einige zehn MB). Okay?“ Erst nach Zustimmung weiter.

- [ ] **Step 2: Pakete installieren**

Run: `npm install --save-dev --no-audit --no-fund "vitest@^4.1.0" "@cloudflare/vitest-pool-workers@^0.23.0"`
Expected: `added ... packages`, kein Fehler. Danach `git status --short` prüfen: es darf nur `package.json` und evtl. `package-lock.json` geändert sein. Eine neu entstandene `package-lock.json` löschen, weil das Projekt `pnpm-lock.yaml` nutzt.

- [ ] **Step 3: Skript ergänzen**

In `package.json` unter `"scripts"` hinzufügen:

```json
"test": "vitest run",
```

- [ ] **Step 4: `vitest.config.ts` anlegen**

```ts
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      miniflare: {
        compatibilityFlags: ["nodejs_compat"],
        compatibilityDate: "2025-01-01",
        d1Databases: ["DB"],
      },
    }),
  ],
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
  },
});
```

Falls die installierte Version eine andere API hat (Fehler wie „cloudflareTest is not exported“), die Datei `node_modules/@cloudflare/vitest-pool-workers/README.md` lesen und die Konfiguration entsprechend anpassen. Die Binding-Namen (`DB`) und die Test-Dateien bleiben gleich.

- [ ] **Step 5: `tests/setup.ts` anlegen**

```ts
import { env } from "cloudflare:workers";
import { beforeEach, vi } from "vitest";

const migrations = import.meta.glob("../drizzle/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

async function migrate() {
  const db = env.DB!;
  const exists = await db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='cat'")
    .first();
  if (exists) return;
  const files = Object.keys(migrations).sort();
  for (const file of files) {
    const statements = migrations[file]
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const statement of statements) await db.prepare(statement).run();
  }
}

beforeEach(async () => {
  await migrate();
  const db = env.DB!;
  await db.batch(
    ["cooldowns", "sessions", "accounts", "players", "cat", "login_attempts"].map((t) =>
      db.prepare(`DELETE FROM ${t}`),
    ),
  );
  vi.useFakeTimers({ toFake: ["Date"] });
});
```

- [ ] **Step 6: `tests/helpers.ts` anlegen**

```ts
import { vi } from "vitest";
import { GET, POST } from "../app/api/cat/route";

export const T0 = 1_800_000_000_000;

export function setTime(ms: number) {
  vi.setSystemTime(ms);
}

export function get(session?: string) {
  return GET(
    new Request("http://test/api/cat", {
      headers: session ? { "x-byte-session": session } : {},
    }),
  );
}

export function post(body: object, session?: string, headers: Record<string, string> = {}) {
  return POST(
    new Request("http://test/api/cat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(session ? { "x-byte-session": session } : {}),
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );
}

export async function register(name: string, password = "geheim1234") {
  const res = await post({ action: "register", name, password });
  const body = (await res.json()) as any;
  return { res, body, session: body.session as string };
}

export function act(session: string, action: string) {
  return post({ action }, session);
}
```

- [ ] **Step 7: Rauchtest `tests/smoke.test.ts` schreiben**

```ts
import { expect, test } from "vitest";
import { T0, get, setTime } from "./helpers";

test("GET legt Byte mit 72 % Sättigung und 84 % Zuneigung an", async () => {
  setTime(T0);
  const res = await get();
  expect(res.status).toBe(200);
  const body = (await res.json()) as any;
  expect(body.food).toBe(72);
  expect(body.love).toBe(84);
  expect(body.account).toBe(false);
  expect(body.board).toEqual([]);
});
```

- [ ] **Step 8: Test laufen lassen**

Run: `npm test`
Expected: 1 Test PASS. Bei Fehlern wegen `cloudflare:workers` oder Migrationen zuerst Step 4 und 5 prüfen. Dieser Schritt muss grün sein, bevor es weitergeht.

- [ ] **Step 9: Commit (nur mit Erlaubnis)**

```bash
git add package.json vitest.config.ts tests
git commit -m "Vitest mit Workers-Pool und lokaler D1 einrichten"
```

---

### Task 2: Charakterisierungstests für den Server

Die Tests beschreiben das **aktuelle** Verhalten. Sie laufen gegen den unveränderten `route.ts` und müssen grün sein. Alle Zeiten sind relativ zu `T0`. Wichtige Zahlen aus dem Code: gemeinsame Pause 5 s, Lebensfrist 72 h, Start `foodExpires = T0 + 0,72 * 72 h`, Start-Zuneigung 84 %, Login-Limit 12 Versuche je 5 Minuten.

**Files:**
- Create: `tests/account.test.ts`, `tests/interact.test.ts`, `tests/revive.test.ts`, `tests/race.test.ts`

**Interfaces:**
- Consumes: alles aus `tests/helpers.ts` (Task 1).

- [ ] **Step 1: `tests/account.test.ts` schreiben**

```ts
import { expect, test } from "vitest";
import { T0, get, post, register, setTime } from "./helpers";

test("Registrieren liefert Session, Konto und 0 Punkte", async () => {
  setTime(T0);
  const { res, body, session } = await register("Lisa");
  expect(res.status).toBe(200);
  expect(session).toMatch(/^[a-f0-9]{32}$/);
  expect(body.account).toBe(true);
  expect(body.me).toEqual({ name: "Lisa", points: 0 });
});

test("zu kurzes Passwort wird abgelehnt", async () => {
  setTime(T0);
  const res = await post({ action: "register", name: "Lisa", password: "kurz" });
  expect(res.status).toBe(400);
});

test("Spitzname ist ohne Groß-/Kleinschreibung eindeutig", async () => {
  setTime(T0);
  await register("Lisa");
  const { res } = await register("lisa");
  expect(res.status).toBe(409);
});

test("Login mit richtigem und falschem Passwort", async () => {
  setTime(T0);
  await register("Lisa", "geheim1234");
  const bad = await post({ action: "login", name: "Lisa", password: "falsch" });
  expect(bad.status).toBe(401);
  const good = await post({ action: "login", name: "lisa", password: "geheim1234" });
  expect(good.status).toBe(200);
  expect(((await good.json()) as any).session).toMatch(/^[a-f0-9]{32}$/);
});

test("nach 12 Fehlversuchen kommt 429", async () => {
  setTime(T0);
  await register("Lisa");
  for (let i = 0; i < 12; i++) {
    const res = await post({ action: "login", name: "Lisa", password: "falsch" });
    expect(res.status).toBe(401);
  }
  const blocked = await post({ action: "login", name: "Lisa", password: "falsch" });
  expect(blocked.status).toBe(429);
});

test("Umbenennen ändert den Namen und den Login-Schlüssel", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  const res = await post({ action: "rename", name: "Lisbeth" }, session);
  expect(res.status).toBe(200);
  expect(((await res.json()) as any).me.name).toBe("Lisbeth");
  const login = await post({ action: "login", name: "Lisbeth", password: "geheim1234" });
  expect(login.status).toBe(200);
});

test("Umbenennen auf einen vergebenen Namen ergibt 409", async () => {
  setTime(T0);
  await register("Lisa");
  const { session } = await register("Tom");
  const res = await post({ action: "rename", name: "Lisa" }, session);
  expect(res.status).toBe(409);
});

test("Logout macht die Session ungültig", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  await post({ action: "logout" }, session);
  const body = (await (await get(session)).json()) as any;
  expect(body.account).toBe(false);
});

test("Aktionen ohne Anmeldung ergeben 401", async () => {
  setTime(T0);
  const res = await post({ action: "food" });
  expect(res.status).toBe(401);
});

test("falscher Content-Type und Cross-Site-Anfragen werden abgelehnt", async () => {
  setTime(T0);
  const plain = await post({ action: "food" }, undefined, { "content-type": "text/plain" });
  expect(plain.status).toBe(403);
  const cross = await post({ action: "food" }, undefined, { "sec-fetch-site": "cross-site" });
  expect(cross.status).toBe(403);
});
```

- [ ] **Step 2: `tests/interact.test.ts` schreiben**

```ts
import { expect, test } from "vitest";
import { T0, act, get, register, setTime } from "./helpers";

const SECOND = 1000;
const LIFETIME = 72 * 60 * 60 * 1000;

async function ready() {
  setTime(T0);
  const { session } = await register("Lisa");
  await get(session);
  setTime(T0 + 6 * SECOND); // gemeinsame Pause (5 s) ist vorbei
  return session;
}

test("Füttern gibt 5 Punkte und setzt die Sättigung auf 100 %", async () => {
  const session = await ready();
  const res = await act(session, "food");
  expect(res.status).toBe(200);
  const body = (await res.json()) as any;
  expect(body.me.points).toBe(5);
  expect(body.food).toBe(100);
  expect(body.foodExpires).toBe(T0 + 6 * SECOND + LIFETIME);
});

test("Streicheln hebt die Zuneigung von 84 auf 96 %", async () => {
  const session = await ready();
  const body = (await (await act(session, "love")).json()) as any;
  expect(body.love).toBe(96);
  expect(body.me.points).toBe(5);
});

test("Miauen gibt 1 Punkt und zählt calls hoch", async () => {
  const session = await ready();
  const body = (await (await act(session, "meow")).json()) as any;
  expect(body.me.points).toBe(1);
  expect(body.calls).toBe(1);
});

test("Zuneigung ist bei 100 % gedeckelt", async () => {
  const session = await ready();
  let t = T0 + 6 * SECOND;
  for (const action of ["love", "play", "study", "brush"]) {
    setTime(t);
    await act(session, action);
    t += 6 * SECOND;
  }
  setTime(t);
  const body = (await (await get(session)).json()) as any;
  expect(body.love).toBe(100);
});

test("dieselbe Aktion hat einen eigenen Cooldown, andere Aktionen nicht", async () => {
  const session = await ready();
  expect((await act(session, "food")).status).toBe(200);
  setTime(T0 + 12 * SECOND);
  const again = await act(session, "food");
  expect(again.status).toBe(429);
  expect(((await again.json()) as any).error).toBe("Byte braucht noch einen Moment.");
  const other = await act(session, "meow");
  expect(other.status).toBe(200);
});

test("gemeinsame Pause: eine zweite Aktion binnen 5 s wird abgelehnt", async () => {
  const session = await ready();
  expect((await act(session, "meow")).status).toBe(200);
  setTime(T0 + 6 * SECOND + 2 * SECOND);
  expect((await act(session, "love")).status).toBe(429);
  setTime(T0 + 6 * SECOND + 6 * SECOND);
  expect((await act(session, "love")).status).toBe(200);
});

test("unbekannte Aktion ergibt 400", async () => {
  const session = await ready();
  expect((await act(session, "fliegen")).status).toBe(400);
});

test("Rangliste enthält nur Konten und ist nach Punkten sortiert", async () => {
  const session = await ready();
  await act(session, "food");
  const body = (await (await get(session)).json()) as any;
  expect(body.board).toEqual([{ name: "Lisa", points: 5 }]);
});

test("nach Ablauf der Lebensfrist ist Byte tot und Aktionen ergeben 409", async () => {
  const session = await ready();
  setTime(T0 + LIFETIME); // Startfrist ist nur 0,72 * 72 h
  const status = (await (await get(session)).json()) as any;
  expect(status.food).toBe(0);
  const res = await act(session, "food");
  expect(res.status).toBe(409);
  expect(((await res.json()) as any).error).toBe(
    "Byte ist gestorben. Beteilige dich an der gemeinsamen Futterrunde.",
  );
});
```

- [ ] **Step 3: `tests/revive.test.ts` schreiben**

```ts
import { expect, test } from "vitest";
import { T0, get, post, register, setTime } from "./helpers";

const LIFETIME = 72 * 60 * 60 * 1000;

async function deadWith(...names: string[]) {
  setTime(T0);
  const sessions: string[] = [];
  for (const name of names) sessions.push((await register(name)).session);
  await get(sessions[0]);
  setTime(T0 + LIFETIME); // länger als die Startfrist, Byte ist tot
  const state = (await (await get(sessions[0])).json()) as any;
  return { sessions, round: state.foodExpires as number };
}

test("alle Konten füttern, dann lebt Byte wieder", async () => {
  const { sessions, round } = await deadWith("Lisa", "Tom");
  const first = (await (await post({ action: "revive", round }, sessions[0])).json()) as any;
  expect(first.revival).toMatchObject({ total: 2, fed: 1, contributed: 1 });
  expect(first.food).toBe(0);
  const second = await post({ action: "revive", round }, sessions[1]);
  expect(second.status).toBe(200);
  const body = (await second.json()) as any;
  expect(body.food).toBe(100);
});

test("eine zweite Portion desselben Kontos wird abgelehnt", async () => {
  const { sessions, round } = await deadWith("Lisa", "Tom");
  await post({ action: "revive", round }, sessions[0]);
  const again = await post({ action: "revive", round }, sessions[0]);
  expect(again.status).toBe(409);
});

test("wer sich erst nach dem Verhungern registriert, gehört nicht zur Runde", async () => {
  const { sessions, round } = await deadWith("Lisa", "Tom");
  const late = await register("Nina");
  const res = await post({ action: "revive", round }, late.session);
  expect(res.status).toBe(409);
  await post({ action: "revive", round }, sessions[0]);
  const last = (await (await post({ action: "revive", round }, sessions[1])).json()) as any;
  expect(last.food).toBe(100);
});

test("eine ungültige oder zukünftige Runde wird abgelehnt", async () => {
  const { sessions, round } = await deadWith("Lisa");
  expect((await post({ action: "revive", round: round + 10_000_000_000 }, sessions[0])).status).toBe(400);
  expect((await post({ action: "revive", round: "x" }, sessions[0])).status).toBe(400);
});
```

- [ ] **Step 4: `tests/race.test.ts` schreiben**

```ts
import { expect, test } from "vitest";
import { T0, act, get, register, setTime } from "./helpers";

test("zwei gleichzeitige Aktionen im selben Moment: nur eine wird angenommen", async () => {
  setTime(T0);
  const a = await register("Lisa");
  const b = await register("Tom");
  await get(a.session);
  setTime(T0 + 6000);
  const [r1, r2] = await Promise.all([act(a.session, "food"), act(b.session, "food")]);
  expect([r1.status, r2.status].sort()).toEqual([200, 429]);
  const board = ((await (await get(a.session)).json()) as any).board as { points: number }[];
  expect(board.reduce((sum, p) => sum + p.points, 0)).toBe(5);
});
```

- [ ] **Step 5: Alle Tests laufen lassen**

Run: `npm test`
Expected: alle Tests PASS.

- [ ] **Step 6: Bei Fehlschlägen unterscheiden**

Zuerst prüfen, ob der **Test** falsch rechnet (Zahlen/Zeit). Dann den Test korrigieren. Zeigt ein Test echtes Fehlverhalten im Code (zum Beispiel falsche Punkte, ein doppelt zählender Cooldown), dann: nicht im Umbau mitfixen. Den Befund dem Nutzer melden, den Test mit `test.fails(...)` markieren oder bis zur Entscheidung auslassen, die Korrektur als eigenen Commit nach dem Umbau (Test zuerst rot, dann Fix, dann grün).

- [ ] **Step 7: Commit (nur mit Erlaubnis)**

```bash
git add tests
git commit -m "Charakterisierungstests für Konto, Aktionen, Wiederbelebung und Rennen"
```

---

### Task 3: Server-Code in Module aufteilen

Der Code wird **wortgleich** aus `app/api/cat/route.ts` verschoben. Zeilennummern beziehen sich auf den Stand vor Task 3. Nach jedem Teilschritt `npm test` ausführen, es muss grün bleiben.

**Files:**
- Create: `lib/server/db.ts`, `lib/server/http.ts`, `lib/server/auth.ts`, `lib/server/initialize.ts`, `lib/server/state.ts`, `lib/server/actions/account.ts`, `lib/server/actions/revive.ts`, `lib/server/actions/interact.ts`
- Modify: `app/api/cat/route.ts`

**Interfaces:**
- Produces:
  - `db.ts`: `unit:number`, `month:number`, `db():D1Database`, `sql(s:string,...v:(string|number)[])`, `secret():string`, `digest(v:string):Promise<string>`, `passwordHash(pw:string,salt:string):Promise<string>`, `loginKey(name:string):string`, `roster:string`
  - `http.ts`: `response(data:unknown,status?:number):Response`, `type Body={action?:string;name?:string;password?:string;round?:number}`
  - `auth.ts`: `identity(req:Request):Promise<Identity>`, `type Identity`
  - `initialize.ts`: `initialize(now:number):Promise<void>`
  - `state.ts`: `state(who:Identity):Promise<...>`
  - Handler: `(req:Request, body:Body, who:Identity, now:number) => Promise<Response>`

- [ ] **Step 1: `lib/server/db.ts`**

Verschiebe aus `route.ts` die Zeilen 4–18 (`unit`, `month`, `db`, `sql`, `secret`, `digest`, `passwordHash`, `loginKey`) und Zeile 31 (`roster`, samt Kommentarzeile 30). Setze oben `import {env} from "cloudflare:workers";` und `export` vor jede Deklaration. Beispiel für die ersten Zeilen:

```ts
import {env} from "cloudflare:workers";

export const unit=360000, month=30*86400000;
export const db=()=>env.DB!;
export const sql=(s:string,...v:(string|number)[])=>db().prepare(s).bind(...v);
export const secret=()=>/* Zeile 7 wortgleich */;
export async function digest(/* Zeilen 8-11 wortgleich */)
export async function passwordHash(/* Zeilen 12-17 wortgleich */)
export function loginKey(name:string){return "user:"+name.normalize("NFKC").toLowerCase()}
// Existing password accounts predate this feature, so a NULL join time counts as zero.
export const roster="password IS NOT NULL AND COALESCE(joined,0)<=food_expires";
```

(„wortgleich“ heißt: den Rumpf unverändert aus der Datei kopieren, nicht neu tippen.)

- [ ] **Step 2: `lib/server/http.ts`**

```ts
export type Body={action?:string;name?:string;password?:string;round?:number};
```

Darunter wortgleich Zeile 39 aus `route.ts` mit `export` davor (`export function response(...)`).

- [ ] **Step 3: `lib/server/auth.ts` und `lib/server/initialize.ts`**

`auth.ts`: Zeilen 19–24 (`identity`, `type Identity`) mit `export`, dazu `import {sql,digest} from "./db";`.

`initialize.ts`: Zeilen 25–29 mit `export async function initialize`, dazu `import {db,sql,unit} from "./db"; import {foodLifetime} from "../cat-rules";`.

- [ ] **Step 4: `lib/server/state.ts`**

Zeilen 32–38 (`state`) mit `export`. Imports: `import {db,sql,unit,roster} from "./db"; import {foodLifetime,sharedPause} from "../cat-rules"; import type {Identity} from "./auth";`.

- [ ] **Step 5: Handler in `lib/server/actions/`**

Jeder Handler hat die Signatur `(req:Request, body:Body, who:Identity, now:number)`. In jedem Handler als erste Zeile `const {action}=body;`, falls der verschobene Code `action` benutzt.

- `account.ts` mit
  - `export async function handleLogout(req:Request){…}`: Rumpf = Zeilen 48–49 (der Inhalt von `if(action==="logout"){…}`).
  - `export async function handleCredentials(req:Request, body:Body, who:Identity, now:number){…}`: Rumpf = Zeilen 52–76 (Inhalt von `if(action==="register"||action==="login"){…}`, `action` aus `body`).
  - `export async function handleRename(_req:Request, body:Body, who:Identity){…}`: Rumpf = Zeilen 80–81.
- `revive.ts`: `export async function handleRevive(_req:Request, body:Body, who:Identity, now:number){…}`, Rumpf = Zeilen 84–90.
- `interact.ts`: `export async function handleInteract(_req:Request, body:Body, who:Identity, now:number){…}`, Rumpf = Zeilen 92 bis zum Ende der Funktion. Imports: `rules`, `foodLifetime`, `sharedPause` aus `../../cat-rules`, `unit` aus `../db`.

Zugehörige Imports ergänzen: `sql`, `db`, `digest`, `secret`, `passwordHash`, `loginKey`, `roster`, `month` aus `../db`, `response` und `Body` aus `../http`, `state` aus `../state`, `Identity` aus `../auth`. Der TypeScript-Check in Step 7 zeigt fehlende Imports.

Hinweis: Die Zeilen 48–49 usw. enthalten ihre eigenen `return`-Statements. Weil sie jetzt am Funktionsende stehen, ändert sich nichts. Nicht verändern.

- [ ] **Step 6: `route.ts` auf Routing reduzieren**

```ts
import {initialize} from "../../../lib/server/initialize";
import {identity} from "../../../lib/server/auth";
import {state} from "../../../lib/server/state";
import {response,type Body} from "../../../lib/server/http";
import {handleLogout,handleCredentials,handleRename} from "../../../lib/server/actions/account";
import {handleRevive} from "../../../lib/server/actions/revive";
import {handleInteract} from "../../../lib/server/actions/interact";

export async function GET(req:Request){await initialize(Date.now());return response(await state(await identity(req)))}
export async function POST(req:Request){
 /* Zeilen 42-46 wortgleich (Header-Prüfung, Body lesen, now, who, initialize) */
 if(action==="logout")return handleLogout(req);
 if(action==="register"||action==="login")return handleCredentials(req,body,who,now);
 if(!who.account||!who.player)return response({error:"Bitte melde dich an."},401);
 if(action==="rename")return handleRename(req,body,who);
 if(action==="revive")return handleRevive(req,body,who,now);
 return handleInteract(req,body,who,now);
}
```

Der Body-Typ in Zeile 43 wird zu `as Body|null`. Die Zeilen 42–46 (Header-Prüfung, JSON lesen, `action`/`now`/`who`, `await initialize(now)`) bleiben wörtlich.

- [ ] **Step 7: Prüfen**

Run: `npx tsc --noEmit -p .` und `npm test`
Expected: keine neuen TypeScript-Fehler in `lib/server` oder `app/api`, alle Tests PASS. Vorbestehende Fehler im Starter-Code ignorieren, aber mit `git stash`-freiem Vergleich festhalten (vorher einmal `npx tsc --noEmit -p . | wc -l` notieren).

- [ ] **Step 8: Commit (nur mit Erlaubnis)**

```bash
git add lib/server app/api/cat/route.ts
git commit -m "Server-Logik in lib/server aufteilen, Verhalten unverändert"
```

---

### Task 4: Client in Hooks und Komponenten zerlegen

**Vor dem Umbau:** Dev-Server mit Node 22 starten (`npm run dev`), die lokale DB hat die Migrationen bereits. Screenshots von Katzenzimmer, Rangliste und Stickerbox in 1280 px und 390 px Breite ablegen (Dateien im Scratchpad, nicht im Repo). Bei einer eingeloggten und einer ausgeloggten Sitzung.

**Files:**
- Create: `lib/cat-types.ts`, `hooks/use-cat.ts`, `hooks/use-reaction.ts`, `components/cat/Bowl.tsx`, `CatStage.tsx`, `ActionPanel.tsx`, `RevivalPanel.tsx`, `StatusCard.tsx`, `ScoreCard.tsx`, `Leaderboard.tsx`, `StickerBox.tsx`, `AccountDialog.tsx`, `lib/sound.ts`
- Modify: `app/page.tsx`
- Modify: `docs/superpowers/specs/2026-11-03-fundament-design.md` (`use-clock.ts` entfällt)

**Interfaces:**
- Produces:
  - `cat-types.ts`: `Tab`, `Entry`, `Data` (wortgleich aus `page.tsx` Zeile 5), `isDead(d:Data|null, now:number):boolean`
  - `use-cat.ts`: `useCat(): {data:Data|null; error:string; setError:(m:string)=>void; busy:boolean; now:number; send:(action:string, fields?:Record<string,string|number>)=>Promise<Data|null>}`, `class ApiError extends Error {status:number}`, `sessionKey`, `sessionHeaders()`
  - `use-reaction.ts`: `useReaction(): {message:string; pose:string; say:(message:string, pose:string)=>void}`
  - `sound.ts`: `playMeow():void`

- [ ] **Step 1: `lib/cat-types.ts`**

```ts
export type Tab="Katzenzimmer"|"Rangliste"|"Stickerbox";
export type Entry={name:string;points:number};
export type Data={revival:{total:number;fed:number;eligible:number;contributed:number};food:number;love:number;calls:number;me:Entry|null;board:Entry[];account:boolean;foodExpires:number;now:number;sharedUntil:number;cooldowns:Record<string,number>};
export const isDead=(d:Data|null,now:number)=>!!d&&now>=d.foodExpires;
```

- [ ] **Step 2: `lib/sound.ts`**

Die Funktion `sound()` aus `page.tsx` Zeile 9 wortgleich, umbenannt zu `export function playMeow()`.

- [ ] **Step 3: `hooks/use-reaction.ts`**

```ts
"use client";
import {useEffect,useRef,useState} from "react";

export function useReaction(){
 const [message,setMessage]=useState(""),[pose,setPose]=useState("");
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 function say(next:string,nextPose:string){
  if(timer.current)clearTimeout(timer.current);
  setMessage(next);setPose(nextPose);
  timer.current=setTimeout(()=>{setMessage("");setPose("")},3500);
 }
 return {message,pose,say};
}
```

- [ ] **Step 4: `hooks/use-cat.ts`**

Die Logik stammt aus `page.tsx` Zeilen 11–12, 16–17 und 21–38. Fachlich bleibt alles gleich. Die UI-Folgen (Dialog schließen, Sprechblase, Ton) übernimmt die Seite.

```ts
"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import type {Data} from "../lib/cat-types";

export const sessionKey="byte-session-v2";
export function sessionHeaders():Record<string,string>{const session=localStorage.getItem(sessionKey);return session?{"X-Byte-Session":session}:{}}
export class ApiError extends Error{constructor(message:string,readonly status:number){super(message)}}

export function useCat(){
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[now,setNow]=useState(0);
 const sending=useRef(false),offset=useRef(0),revision=useRef(0);
 const apply=useCallback((next:Data)=>{offset.current=next.now-Date.now();setNow(next.now);setData(next)},[]);
 useEffect(()=>{
  let active=true;
  async function refresh(){const revisionAtStart=revision.current;try{const res=await fetch("/api/cat",{cache:"no-store",headers:sessionHeaders()});if(!res.ok)throw Error();const next=await res.json() as Data;if(active&&!sending.current&&revisionAtStart===revision.current){apply(next);setError("")}}catch{if(active)setError("Byte ist gerade offline. Wir versuchen es gleich erneut.")}}
  refresh();
  const poll=setInterval(refresh,8000),clock=setInterval(()=>setNow(Date.now()+offset.current),1000);
  return()=>{active=false;clearInterval(poll);clearInterval(clock)};
 },[apply]);
 const send=useCallback(async(action:string,fields:Record<string,string|number>={}):Promise<Data|null>=>{
  if(sending.current)return null;
  revision.current++;sending.current=true;setBusy(true);setError("");
  try{
   const res=await fetch("/api/cat",{method:"POST",headers:{"Content-Type":"application/json",...sessionHeaders()},body:JSON.stringify({action,...fields})});
   const payload=await res.json() as Data&{error?:string;session?:string};
   if(!res.ok){
    if(payload.board)apply(payload);
    if(res.status===401&&!["login","register"].includes(action)){localStorage.removeItem(sessionKey);setData(prev=>prev?{...prev,account:false,me:null}:prev)}
    throw new ApiError(payload.error||"Versuch es noch einmal.",res.status);
   }
   if(action==="register"||action==="login"){
    if(!payload.session)throw Error("Die Sitzung konnte nicht gestartet werden.");
    localStorage.setItem(sessionKey,payload.session);
    const check=await fetch("/api/cat",{cache:"no-store",headers:sessionHeaders()});
    if(!check.ok)throw Error("Die Anmeldung konnte nicht bestätigt werden.");
    const verified=await check.json() as Data;
    if(!verified.account){localStorage.removeItem(sessionKey);throw Error("Die Anmeldung konnte auf diesem Gerät nicht gespeichert werden.")}
    apply(verified);return verified;
   }
   if(action==="logout")localStorage.removeItem(sessionKey);
   apply(payload);return payload;
  }finally{revision.current++;sending.current=false;setBusy(false)}
 },[apply]);
 return {data,error,setError,busy,now,send};
}
```

Vor dem Übernehmen die Zeilen 21–38 von `page.tsx` noch einmal mit diesem Code vergleichen. Einziger bewusster Unterschied: Fehlertexte setzt die Seite (siehe Step 6), und der Aufruf von `show()`/`Mode("login")` bei 401 wandert in die Seite.

- [ ] **Step 5: Komponenten anlegen (JSX wortgleich aus `page.tsx`)**

Regel: JSX-Block wortgleich verschieben, nur Bezeichner ersetzen: `d`→`data`, `D`→entfällt, Callbacks über Props. Die Imports der `lucide-react`-Icons wandern mit.

| Datei | Quelle in `page.tsx` | Props |
|---|---|---|
| `Bowl.tsx` | Zeile 10 | keine, `export function Bowl()` |
| `CatStage.tsx` | Zeile 49 vom `<div className={dead?"stage memorial":"stage"}>` bis zum passenden `</div>` nach `ABB. 01 — FELIS CAMPUS` | `{dead:boolean; message:string; pose:string; audio:boolean; onToggleAudio:()=>void}`; `msg`→`message`, `react`→`pose`, `toggle`→`onToggleAudio` |
| `RevivalPanel.tsx` | Zeile 49, `<section className="revival">…</section>` | `{data:Data; busy:boolean; onRevive:()=>void; onLogin:()=>void}`; `send("revive",{round:d.foodExpires})`→`onRevive()`, `show()`→`onLogin()` |
| `ActionPanel.tsx` | Zeile 49, `<div className="actions">…</div>` samt `actions`-Array (Zeile 7), `remaining`, `duration` (Zeilen 41–42) | `{data:Data|null; now:number; busy:boolean; onAction:(a:string)=>void; onLogin:()=>void}` |
| `StatusCard.tsx` | Zeile 50, `<section className="card status">…</section>`, dazu `foodMinutes` (Zeile 39) | `{data:Data|null; now:number}`; `dead` über `isDead(data,now)` |
| `ScoreCard.tsx` | Zeile 51 | `{points:number; onBoard:()=>void}` |
| `Leaderboard.tsx` | Zeile 52 | `{data:Data|null; onRoom:()=>void}` |
| `StickerBox.tsx` | Zeile 53 samt `stickers`-Array (Zeile 6) | `{tab:Tab; onAll:()=>void}` |

`phrases` (Zeile 8) bleibt in `page.tsx`, weil nur die Seite die Sprechblase setzt.

- [ ] **Step 6: `AccountDialog.tsx`**

Verschiebe das `<dialog>` (Zeilen 55–62) in eine Komponente. Sie besitzt `mode`, `draft`, `password` und das `dialog`-Ref.

```tsx
"use client";
import {useEffect,useRef,useState} from "react";
import {X} from "lucide-react";

export type DialogMode="register"|"login"|"profile";
type Props={open:boolean;initialMode:DialogMode;initialName:string;busy:boolean;error:string;onClose:()=>void;onSubmit:(action:string,fields:Record<string,string>)=>void};

export function AccountDialog({open,initialMode,initialName,busy,error,onClose,onSubmit}:Props){
 const [mode,setMode]=useState<DialogMode>(initialMode),[draft,setDraft]=useState(initialName),[password,setPassword]=useState("");
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(open){setMode(initialMode);setDraft(initialName);setPassword("");dialog.current?.showModal()}else dialog.current?.close()},[open]);
 /* return: das <dialog> aus page.tsx Zeilen 55-62 wortgleich, mit diesen Ersetzungen:
    draft/V→draft/setDraft, Password→setPassword, Mode→setMode, formError→error,
    close()→onClose(), busy→busy,
    onSubmit der Form: e.preventDefault(); onSubmit(mode==="profile"?"rename":mode, mode==="profile"?{name:draft}:{name:draft,password}),
    Logout-Button: onClick={()=>onSubmit("logout",{})},
    onCancel: if(busy)e.preventDefault();else onClose() */
}
```

Der Kommentarblock im Return ist die exakte Anweisung, kein Platzhalter: den JSX aus den genannten Zeilen kopieren und genau diese Ersetzungen anwenden. Der Link „Neu hier? / Schon registriert?“ ruft `setMode(...)`, `setPassword("")` auf. Das frühere `F("")` entfällt, weil die Seite `error` beim Öffnen und Wechseln selbst leert (siehe Step 7).

- [ ] **Step 7: `app/page.tsx` neu zusammensetzen**

Behalten: Kopfzeile, Überschrift, `sub`, `error`-Anzeige, Footer, Tab-Navigation (Zeilen 44–48, 54) wortgleich. Der Zustand der Seite ist nur noch:

```tsx
"use client";
import {useEffect,useState} from "react";
/* lucide-Imports für Header/Brand/Nav/Eyebrow wie bisher */
import {useCat} from "../hooks/use-cat";
import {useReaction} from "../hooks/use-reaction";
import {isDead,type Tab} from "../lib/cat-types";
import {playMeow} from "../lib/sound";
/* Komponenten-Imports */

const phrases={/* Zeile 8 wortgleich */};

export default function Page(){
 const {data,error,setError,busy,now,send}=useCat();
 const {message,pose,say}=useReaction();
 const [tab,setTab]=useState<Tab>("Katzenzimmer"),[audio,setAudio]=useState(false);
 const [modal,setModal]=useState(false),[formError,setFormError]=useState(""),[dialogMode,setDialogMode]=useState<DialogMode>("register"),[dialogName,setDialogName]=useState("");
 const dead=isDead(data,now);
 useEffect(()=>{setAudio(localStorage.getItem("byte-sound")==="on")},[]);

 function openDialog(forced?:DialogMode){
  setDialogMode(forced??(data?.account?"profile":data?.me?"register":"login"));
  setDialogName(data?.me?.name||localStorage.getItem("byte-name")||"");
  setFormError("");setModal(true);
 }
 async function run(action:string,fields:Record<string,string|number>={}){
  setFormError("");
  try{
   const result=await send(action,fields);
   if(!result)return;
   if(["register","login","logout","rename"].includes(action))setModal(false);
   else if(action==="revive")say(result.food>0?"Miau! Ich bin wieder da!":"","");
   else{if(action==="meow"&&audio)playMeow();const pool=phrases[action as keyof typeof phrases];say(pool[Math.floor(Math.random()*pool.length)],action)}
  }catch(e){
   const text=e instanceof Error?e.message:"Verbindung fehlgeschlagen.";
   if(e instanceof ApiError&&e.status===401&&!["login","register"].includes(action)){setError(text);openDialog("login")}
   else(modal?setFormError:setError)(text);
  }
 }
 function navigate(t:Tab){setTab(t);window.scrollTo({top:0,behavior:"smooth"})}
 function toggleSound(){setAudio(!audio);localStorage.setItem("byte-sound",audio?"off":"on")}
 /* return: wie bisher, mit <CatStage/>, <ActionPanel/> bzw. <RevivalPanel/>, <StatusCard/>, <ScoreCard/>, <Leaderboard/>, <StickerBox/>, <AccountDialog/> */
}
```

Zu `ApiError` zusätzlich aus `../hooks/use-cat` importieren. Rückgabe: das JSX aus den Zeilen 44–62 mit den Komponenten an den bisherigen Stellen und folgenden Anbindungen:
- Aktionen: `onAction={a=>run(a)}`, `onLogin={()=>openDialog()}`, `onRevive={()=>run("revive",{round:data!.foodExpires})}`.
- Profilknopf im Header: `onClick={()=>openDialog()}`, Beschriftung `data?.account?data.me?.name:"Anmelden"`.
- `<AccountDialog open={modal} initialMode={dialogMode} initialName={dialogName} busy={busy} error={formError} onClose={()=>setModal(false)} onSubmit={run}/>`.

Das Verhalten bleibt gleich. Bewusste Kleinigkeit: Die Passwortfeld-Leerung beim Schließen und der Moduswechsel geschehen jetzt im Dialog selbst.

- [ ] **Step 8: Spec anpassen**

In `docs/superpowers/specs/2026-11-03-fundament-design.md` die Zeile `use-clock.ts …` entfernen und bei `use-cat.ts` ergänzen: „Polling, Uhr (Server-Zeit-Offset), Session-Header, Revision-Zähler, send()“. Außerdem im Abschnitt „Tests“ den Satz „Die Server-Module werden direkt aufgerufen“ ersetzen durch „Alle Tests laufen über die Route mit echten `Request`-Objekten, sodass sie den Umbau unverändert überstehen.“

- [ ] **Step 9: Prüfen**

Run: `npx tsc --noEmit -p .`, `npm test`, `npm run lint`
Expected: keine neuen Fehler, Tests PASS. Danach Dev-Server neu laden, die Screenshots von vorhin neu erzeugen und gegenüberstellen: pixelgleich oder nur unsichtbare Unterschiede. Dann von Hand durchklicken: Registrieren, Ausloggen, Login, alle sechs Aktionen mit Cooldown-Anzeige, Umbenennen, Ton umschalten, Tabs wechseln.

- [ ] **Step 10: Commit (nur mit Erlaubnis)**

```bash
git add app/page.tsx components/cat hooks lib docs
git commit -m "Client in Hooks und Komponenten zerlegen, Verhalten unverändert"
```

---

### Task 5: CSS lesbar machen und aufteilen

Die Reihenfolge der Regeln bleibt erhalten (Kaskade!). Es wird nur an zusammenhängenden Stellen getrennt.

**Files:**
- Create: `scripts/format-css.mjs` (nur temporär, am Ende löschen), `styles/base.css`, `header.css`, `stage.css`, `cards.css`, `dialog.css`, `stickers.css`
- Modify: `app/globals.css`

- [ ] **Step 1: Sicherung der Referenz**

Run: `cp app/globals.css <scratchpad>/globals.original.css`

- [ ] **Step 2: Temporären Formatierer `scripts/format-css.mjs` schreiben**

```js
import {readFileSync,writeFileSync} from "node:fs";
const [,, input, output] = process.argv;
const css = readFileSync(input, "utf8");
let out = "", depth = 0, quote = null;
for (const ch of css) {
  if (quote) { out += ch; if (ch === quote) quote = null; continue; }
  if (ch === '"' || ch === "'") { quote = ch; out += ch; continue; }
  if (ch === "{") { depth++; out += " {\n" + "  ".repeat(depth); continue; }
  if (ch === "}") { depth--; out = out.replace(/\s+$/, "") + "\n" + "  ".repeat(depth) + "}\n" + (depth === 0 ? "\n" : "  ".repeat(depth)); continue; }
  if (ch === ";") { out += ";\n" + "  ".repeat(depth); continue; }
  out += ch;
}
writeFileSync(output, out.replace(/[ \t]+\n/g, "\n").trim() + "\n");
```

- [ ] **Step 3: Formatieren und Äquivalenz prüfen**

Run: `node scripts/format-css.mjs app/globals.css <scratchpad>/formatted.css`
Dann prüfen, dass nach dem Entfernen aller Leerzeichen und Zeilenumbrüche beide Dateien identisch sind:

```bash
node -e 'const fs=require("fs");const n=f=>fs.readFileSync(f,"utf8").replace(/\s+/g,"");const a=n(process.argv[1]),b=n(process.argv[2]);console.log(a===b?"GLEICH":"UNTERSCHIEDLICH")' <scratchpad>/globals.original.css <scratchpad>/formatted.css
```

Expected: `GLEICH`. Sonst `format-css.mjs` korrigieren (häufigste Ursache: Semikolon oder Klammern in Strings oder `url(...)`).

- [ ] **Step 4: Auf Dateien verteilen**

`formatted.css` lesen und an **zusammenhängenden** Stellen in diese Dateien schneiden, in dieser Reihenfolge: `base.css` (Reset, body, Fokus, allgemeine Buttons), `header.css` (header, `.bar`, `.brand`, nav, `.profile`), `stage.css` (Eyebrow, h1, `.stage`, Katze, Sprechblase, Animationen `@keyframes`), `cards.css` (`.columns`, `.card`, Status, Score, Rangliste, `.actions`, `.revival`), `dialog.css` (`dialog`, `.close`, `.save`, `.formlink`), `stickers.css` (`.collection`, `.stickers`, Footer) und die `@media`-Blöcke jeweils zu den Regeln, die sie überschreiben. Die Schnittstellen so legen, dass die Reihenfolge der Konkatenation exakt der Originalreihenfolge entspricht. Kein Umsortieren. Wenn ein Bereich nicht sauber trennbar ist, lieber größere Dateien als eine verschobene Regel. Jede Datei bekommt oben einen Kommentar mit einem Satz zum Inhalt.

- [ ] **Step 5: `app/globals.css` als Einstieg**

```css
@import "../styles/base.css";
@import "../styles/header.css";
@import "../styles/stage.css";
@import "../styles/cards.css";
@import "../styles/dialog.css";
@import "../styles/stickers.css";
```

Falls der Dev-Server `@import` nicht auflöst, stattdessen die Dateien in `app/layout.tsx` nacheinander mit `import "../styles/….css";` laden, in derselben Reihenfolge.

- [ ] **Step 6: Äquivalenz der Teile prüfen**

Konkateniere die sechs Dateien in der Reihenfolge und vergleiche wie in Step 3 gegen die Originalreferenz (Whitespace und Kommentare ignorieren: vorher Kommentare mit `.replace(/\/\*[\s\S]*?\*\//g,"")` entfernen). Expected: `GLEICH`.

- [ ] **Step 7: Sichtprüfung**

Dev-Server neu laden, Screenshots (wie in Task 4) erzeugen und mit den Referenzen vergleichen. Danach `scripts/format-css.mjs` löschen.

- [ ] **Step 8: Commit (nur mit Erlaubnis)**

```bash
git add app/globals.css app/layout.tsx styles
git commit -m "CSS lesbar formatieren und in Dateien aufteilen"
```

---

### Task 6: README und Abschluss

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README schreiben**

```markdown
# Miau Campus · Kurskatze WWI25A2

Eine Web-App, in der der ganze Kurs gemeinsam die virtuelle Katze **Byte** versorgt: füttern,
streicheln, bürsten, spielen, lernen und miauen bringt Pfotenpunkte. Wird Byte 72 Stunden nicht
gefüttert, stirbt er. Danach muss jedes Kurskonto eine Portion füttern, damit er wieder lebt.

## Starten

Voraussetzung: Node `>=22.13.0`.

    npm install
    npm run dev

Die lokale Datenbank (Cloudflare D1 über Miniflare) legt sich unter `.wrangler/` an. Beim ersten
Start müssen die Migrationen aus `drizzle/` einmal eingespielt werden.

## Tests

    npm test

Die Tests laufen in der Workers-Laufzeit mit einer frischen lokalen D1 und prüfen Konto, Aktionen,
Cooldowns, Wiederbelebung und gleichzeitige Anfragen.

## Aufbau

- `app/page.tsx`: Seite, setzt Hooks und Komponenten zusammen
- `components/cat/`: UI-Bausteine
- `hooks/`: Abruf, Uhr, Session und Reaktionen
- `app/api/cat/route.ts`: Routing der API
- `lib/server/`: Datenbank, Anmeldung, Zustand und Aktionen
- `lib/cat-rules.ts`: Punkte, Cooldowns, Wirkungen
- `styles/`: CSS
- `tests/`: Vitest
```

- [ ] **Step 2: Gesamtprüfung**

Run: `npm test`, `npx tsc --noEmit -p .`, `npm run lint`, `npm run build`
Expected: Tests PASS, keine neuen Fehler. Bei Fehlern im Build prüfen, ob sie schon vor dem Umbau bestanden (mit `git stash` vergleichen).

- [ ] **Step 3: Aufräumen**

Prüfen, dass `git status --short` nur beabsichtigte Dateien zeigt (kein `package-lock.json`, kein `scripts/format-css.mjs`).

- [ ] **Step 4: Commit (nur mit Erlaubnis)**

```bash
git add README.md
git commit -m "README mit Start, Tests und Aufbau"
```
