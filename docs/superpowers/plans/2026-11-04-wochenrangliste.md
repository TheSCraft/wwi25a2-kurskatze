# Wochen-Rangliste Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Im Tab „Rangliste“ gibt es Reiter „Diese Woche“ (Standard) und „Gesamt“. Die Woche beginnt Montag 0 Uhr deutscher Zeit.

**Architecture:** Neue Tabelle `actions` (ein Protokolleintrag pro angenommener Aktion, im selben atomaren D1-Batch wie die Punkte geschrieben). `state()` liefert `weekBoard`, `weekStart`, `weekEnd` über eine Summenabfrage seit `weekStart(now)`. Die Wochengrenze berechnet `lib/week.ts` mit `Intl` (Europe/Berlin). Die Rangliste bekommt Reiter.

**Tech Stack:** Next 16 / vinext, React 19, Cloudflare D1 + Drizzle (nur Schema/Migration), Vitest mit `@cloudflare/vitest-plugin`.

**Spec:** `docs/superpowers/specs/2026-11-04-wochenrangliste-design.md`

## Global Constraints

- Node `>=22.13.0` ist nötig. Auf dem Entwicklerrechner läuft Node 20, deshalb jedes Kommando mit `export PATH=/private/tmp/claude-501/-Users-jonas-Documents-Claude-Kurskatze-wwi25a2-kurskatze/7a4d57cf-a6ec-475f-a9c7-82677e75832e/scratchpad/node22/node_modules/node/bin:$PATH` vorstellen.
- Keine neuen Pakete. `package.json` und `pnpm-lock.yaml` bleiben unverändert.
- Woche: Montag 00:00 bis Sonntag 24:00 in Europe/Berlin (mit Sommer-/Winterzeit). Spielregeln und `lib/cat-rules.ts` bleiben unverändert.
- Tabelle `actions(id integer pk autoincrement, player text not null, action text not null, points integer not null, at integer not null)`, Indizes `actions_at_idx (at)` und `actions_player_at_idx (player, at)`.
- Die drei bestehenden Anweisungen im Batch von `handleInteract` bleiben wortgleich und in ihrer Reihenfolge; `accepted` bleibt das erste Batch-Ergebnis. Die neue vierte Anweisung steht dahinter.
- `weekBoard`: Summe der Punkte seit `weekStart(now)`, nur Konten mit Passwort, `ORDER BY sum(a.points) DESC, max(a.at) ASC`, `LIMIT 100`, öffentlich (auch abgemeldet).
- Texte genau: „Diese Woche“, „Gesamt“, „Punkte seit Montag, 0 Uhr. Neue Woche <restzeit>.“, „Diese Woche hat noch niemand Punkte gesammelt. Wer gibt Byte den ersten Snack?“; unter „Gesamt“ der bisherige Text („Miauen gibt 1 Punkt, Bürsten 4, Füttern und Streicheln je 5, Spielen 6 und Lernen 8.“) und „Die Rangliste ist noch leer. Wer gibt Byte den ersten Snack?“; Ladezustand „Rangliste lädt …“.
- CSS in neuer Datei `styles/weekly.css`, in `app/globals.css` als **letzte** Zeile importiert.
- Migration nicht von Hand schreiben, sondern `npx drizzle-kit generate`.
- Commits nur auf dem Branch `wochenrangliste`, nie pushen. Commit-Trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Nicht anfassen: `scripts/`, `vendor/`, `worker/`, `examples/`, `components/ui/`, bestehende Migrationen `drizzle/0000`–`0005`, `components/stickerbox.tsx`, `lib/sticker-*.ts`, `lib/meow-sound.ts`, `lib/cat-rules.ts`.
- Lint 0 Fehler (die drei `no-img-element`-Warnungen sind bekannt), `npx tsc --noEmit -p .` 0 Zeilen.
- Die lokale Entwicklungsdatenbank des Nutzers (`.wrangler/...`) wird nur in Task 4 und nur additiv migriert (mit Backup). Bis dahin antwortet der Dev-Server auf `/api/cat` mit 500 (`no such table: actions`), das ist erwartet.

## File Structure

```
lib/week.ts                          weekStart, nextWeekStart
lib/format-time.ts                   + remainingTime
db/schema.ts                         + Tabelle actions
drizzle/0006_*.sql (+ meta)          generiert
tests/setup.ts                       actions leeren, Migrationscheck auf actions
tests/week.test.ts                   weekStart/nextWeekStart
tests/format-time.test.ts            + remainingTime
tests/actions.test.ts                Protokoll wird geschrieben
tests/weekly.test.ts                 weekBoard
lib/server/actions/interact.ts       + vierte Batch-Anweisung
lib/server/state.ts                  + weekBoard, weekStart, weekEnd
lib/cat-types.ts                     Data erweitert
components/cat/Leaderboard.tsx       Reiter
styles/weekly.css                    Stil der Reiter
app/globals.css                      + @import
app/page.tsx                         now an Leaderboard
README.md                            Migration auf bestehende DB einspielen
```

---

### Task 1: Wochenberechnung und Restzeit

**Files:**
- Create: `lib/week.ts`, `tests/week.test.ts`
- Modify: `lib/format-time.ts`, `tests/format-time.test.ts`

**Interfaces:**
- Produces: `weekStart(now:number):number`, `nextWeekStart(now:number):number` (ms, Montag 00:00 Europe/Berlin); `remainingTime(until:number, now:number):string`.

- [ ] **Step 1: Failing tests schreiben (`tests/week.test.ts`)**

```ts
import { expect, test } from "vitest";
import { nextWeekStart, weekStart } from "../lib/week";

const t = (iso: string) => Date.parse(iso);

test("weekStart: Winterzeit, Mittwoch", () => {
  expect(weekStart(t("2026-11-04T09:00:00Z"))).toBe(t("2026-11-01T23:00:00Z"));
  expect(nextWeekStart(t("2026-11-04T09:00:00Z"))).toBe(t("2026-11-08T23:00:00Z"));
});

test("weekStart: Sommerzeit, Mittwoch", () => {
  expect(weekStart(t("2026-07-15T12:00:00Z"))).toBe(t("2026-07-12T22:00:00Z"));
  expect(nextWeekStart(t("2026-07-15T12:00:00Z"))).toBe(t("2026-07-19T22:00:00Z"));
});

test("weekStart: Grenze Sonntag 23:59:59 gegen Montag 00:00:00 (Berlin)", () => {
  expect(weekStart(t("2026-11-08T22:59:59Z"))).toBe(t("2026-11-01T23:00:00Z"));
  expect(weekStart(t("2026-11-08T23:00:00Z"))).toBe(t("2026-11-08T23:00:00Z"));
  expect(weekStart(t("2026-11-01T22:59:59Z"))).toBe(t("2026-10-25T23:00:00Z"));
  expect(weekStart(t("2026-11-01T23:00:00Z"))).toBe(t("2026-11-01T23:00:00Z"));
});

test("weekStart: Woche mit Beginn der Sommerzeit (29.03.2026)", () => {
  expect(weekStart(t("2026-03-29T12:00:00Z"))).toBe(t("2026-03-22T23:00:00Z"));
  expect(weekStart(t("2026-03-29T00:30:00Z"))).toBe(t("2026-03-22T23:00:00Z"));
  expect(nextWeekStart(t("2026-03-29T12:00:00Z"))).toBe(t("2026-03-29T22:00:00Z"));
});

test("weekStart: Woche mit Ende der Sommerzeit (25.10.2026)", () => {
  expect(weekStart(t("2026-10-25T12:00:00Z"))).toBe(t("2026-10-18T22:00:00Z"));
  expect(weekStart(t("2026-10-25T00:30:00Z"))).toBe(t("2026-10-18T22:00:00Z"));
  expect(nextWeekStart(t("2026-10-25T12:00:00Z"))).toBe(t("2026-10-25T23:00:00Z"));
});
```

Und an `tests/format-time.test.ts` anhängen (Import oben auf `import { relativeTime, remainingTime } from "../lib/format-time";` ändern):

```ts
test("remainingTime: Grenzen und Einzahl/Mehrzahl", () => {
  expect(remainingTime(NOW + 59 * S, NOW)).toBe("gleich");
  expect(remainingTime(NOW + 60 * S, NOW)).toBe("in 1 Min.");
  expect(remainingTime(NOW + 59 * MIN, NOW)).toBe("in 59 Min.");
  expect(remainingTime(NOW + 60 * MIN, NOW)).toBe("in 1 Std.");
  expect(remainingTime(NOW + 23 * H, NOW)).toBe("in 23 Std.");
  expect(remainingTime(NOW + 24 * H, NOW)).toBe("in 1 Tag");
  expect(remainingTime(NOW + 48 * H, NOW)).toBe("in 2 Tagen");
  expect(remainingTime(NOW + 6 * D, NOW)).toBe("in 6 Tagen");
});

test("remainingTime: abgelaufen gilt als gleich", () => {
  expect(remainingTime(NOW - 5 * S, NOW)).toBe("gleich");
});
```

(`S`, `MIN`, `H`, `D`, `NOW` sind in dieser Testdatei bereits definiert.)

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run tests/week.test.ts tests/format-time.test.ts`
Expected: FAIL (`lib/week` existiert nicht, `remainingTime` ist nicht exportiert).

- [ ] **Step 3: `lib/week.ts` anlegen**

```ts
const TZ = "Europe/Berlin";
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function berlinParts(ms: number) {
  const p = Object.fromEntries(formatter.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { year: +p.year, month: +p.month, day: +p.day, weekday: p.weekday, hour: +p.hour, minute: +p.minute, second: +p.second };
}

// Abstand der Berliner Wanduhr zu UTC zum Zeitpunkt ms (in ms).
function berlinOffset(ms: number) {
  const p = berlinParts(ms);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

// Montag 00:00 Uhr (Europe/Berlin) der Woche von `now`, in Millisekunden.
// Die Zeitumstellung liegt in der Nacht zu Sonntag, der Offset am Montag ist eindeutig.
export function weekStart(now: number): number {
  const p = berlinParts(now);
  const index = WEEKDAYS.indexOf(p.weekday);
  const localMidnight = Date.UTC(p.year, p.month - 1, p.day - index);
  return localMidnight - berlinOffset(localMidnight);
}

// Beginn der folgenden Woche.
export function nextWeekStart(now: number): number {
  return weekStart(weekStart(now) + 7 * DAY + 12 * HOUR);
}
```

- [ ] **Step 4: `remainingTime` an `lib/format-time.ts` anhängen**

```ts

export function remainingTime(until: number, now: number): string {
  const seconds = Math.max(0, Math.floor((until - now) / 1000));
  if (seconds < 60) return "gleich";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `in ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "in 1 Tag" : `in ${days} Tagen`;
}
```

- [ ] **Step 5: Tests laufen lassen**

Run: `npx vitest run tests/week.test.ts tests/format-time.test.ts`
Expected: PASS. Falls die Workers-Laufzeit `Europe/Berlin` oder `hourCycle` nicht unterstützt (Fehler oder falsche Werte), nicht improvisieren: genau melden, welche Werte sie liefert.

- [ ] **Step 6: Prüfungen und Commit**

Run: `npm test` (alle PASS), `npx tsc --noEmit -p .` (0 Zeilen), `npm run lint` (0 Fehler).

```bash
git add lib/week.ts lib/format-time.ts tests/week.test.ts tests/format-time.test.ts
git commit -m "Wochenberechnung für Europe/Berlin und Restzeit-Hilfsfunktion"
```

---

### Task 2: Tabelle `actions`, Migration und Protokoll im Aktions-Batch

**Files:**
- Modify: `db/schema.ts`, `tests/setup.ts`, `lib/server/actions/interact.ts`
- Create: `drizzle/0006_*.sql` (generiert), `tests/actions.test.ts`

**Interfaces:**
- Produces: Tabelle `actions` (siehe Global Constraints); jede angenommene Aktion schreibt genau eine Zeile `(player, action, rule.points, now)`.

- [ ] **Step 1: Failing tests schreiben (`tests/actions.test.ts`)**

```ts
import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { rules } from "../lib/cat-rules";
import { T0, act, get, json, register, setTime } from "./helpers";

const SECOND = 1000;
const LIFETIME = 72 * 60 * 60 * 1000;

type Row = { action: string; points: number; at: number };
async function rows(): Promise<Row[]> {
  const res = await env.DB!.prepare("SELECT action,points,at FROM actions ORDER BY id").all();
  return res.results as Row[];
}

async function ready() {
  setTime(T0);
  const { session } = await register("Lisa");
  await get(session);
  setTime(T0 + 6 * SECOND); // gemeinsame Pause (5 s) ist vorbei
  return session;
}

test("eine angenommene Aktion schreibt genau eine Zeile", async () => {
  const session = await ready();
  expect((await act(session, "food")).status).toBe(200);
  expect(await rows()).toEqual([{ action: "food", points: rules.food.points, at: T0 + 6 * SECOND }]);
});

test("zwei verschiedene Aktionen schreiben zwei Zeilen mit ihren Punkten", async () => {
  const session = await ready();
  await act(session, "food");
  setTime(T0 + 12 * SECOND);
  expect((await act(session, "meow")).status).toBe(200);
  expect(await rows()).toEqual([
    { action: "food", points: rules.food.points, at: T0 + 6 * SECOND },
    { action: "meow", points: rules.meow.points, at: T0 + 12 * SECOND },
  ]);
});

test("abgelehnte Aktionen schreiben keine Zeile (Cooldown, gemeinsame Pause, tote Katze)", async () => {
  const session = await ready();
  await act(session, "food");
  setTime(T0 + 8 * SECOND); // nur 2 s nach der ersten Aktion: gemeinsame Pause
  expect((await act(session, "love")).status).toBe(429);
  setTime(T0 + 20 * SECOND); // gleiche Aktion: Cooldown läuft noch
  expect((await act(session, "food")).status).toBe(429);
  expect(await rows()).toHaveLength(1);
  setTime(T0 + LIFETIME); // Byte ist tot
  expect((await act(session, "meow")).status).toBe(409);
  expect(await rows()).toHaveLength(1);
});

test("Gesamtpunkte und Protokoll laufen nicht auseinander", async () => {
  const session = await ready();
  await act(session, "food");
  setTime(T0 + 12 * SECOND);
  await act(session, "meow");
  const me = (await json(await get(session))).me;
  const sum = (await rows()).reduce((s, r) => s + r.points, 0);
  expect(me.points).toBe(rules.food.points + rules.meow.points);
  expect(sum).toBe(me.points);
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run tests/actions.test.ts`
Expected: FAIL (`no such table: actions`).

- [ ] **Step 3: Schema ergänzen (`db/schema.ts`)**

Am Dateiende anhängen (der Import `index` ist schon vorhanden):

```ts

export const actions=sqliteTable("actions",{id:integer("id").primaryKey({autoIncrement:true}),player:text("player").notNull(),action:text("action").notNull(),points:integer("points").notNull(),at:integer("at").notNull()},(t)=>[index("actions_at_idx").on(t.at),index("actions_player_at_idx").on(t.player,t.at)]);
```

- [ ] **Step 4: Migration generieren**

Run: `npx drizzle-kit generate`
Expected: neue Datei `drizzle/0006_<name>.sql` plus Änderungen an `drizzle/meta/_journal.json` und ein neuer `drizzle/meta/0006_snapshot.json`. SQL prüfen: `CREATE TABLE \`actions\`` mit den fünf Spalten, `CREATE INDEX actions_at_idx` und `actions_player_at_idx`. Fragt `drizzle-kit` interaktiv etwas, abbrechen und melden.

- [ ] **Step 5: `tests/setup.ts` anpassen**

```ts
// alt:
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='events'")
// neu:
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='actions'")
```

```ts
// alt:
    ["cooldowns", "sessions", "accounts", "players", "cat", "login_attempts", "events"].map((t) =>
// neu:
    ["cooldowns", "sessions", "accounts", "players", "cat", "login_attempts", "events", "actions"].map((t) =>
```

- [ ] **Step 6: Vierte Batch-Anweisung in `lib/server/actions/interact.ts`**

Genau eine Ersetzung am Ende der Batch-Liste. Das Ende der dritten Anweisung lautet `...,minimumTeamSize,Number(action==="meow"))]);`. Es wird zu

`...,minimumTeamSize,Number(action==="meow")),sql("INSERT INTO actions(player,action,points,at) SELECT ?,?,?,? WHERE changes()>0",who.player,action,rule.points,now)]);`

Die drei bestehenden Anweisungen bleiben byte-identisch, `const [accepted]=` bleibt. Die neue Anweisung steht **direkt hinter** dem `UPDATE cat`, dessen `changes()` genau dann 1 ist, wenn die Aktion angenommen wurde.

- [ ] **Step 7: Tests laufen lassen**

Run: `npm test`
Expected: alle PASS (bisherige und `tests/actions.test.ts`).

- [ ] **Step 8: Prüfungen und Commit**

Run: `npx tsc --noEmit -p .` (0 Zeilen), `npm run lint` (0 Fehler).

```bash
git add db/schema.ts drizzle tests/setup.ts tests/actions.test.ts lib/server/actions/interact.ts
git commit -m "Tabelle actions und Aktionsprotokoll im selben Batch wie die Punkte"
```

---

### Task 3: `weekBoard`, `weekStart` und `weekEnd` in der API

**Files:**
- Modify: `lib/server/state.ts`, `lib/cat-types.ts`, `docs/superpowers/specs/2026-11-04-wochenrangliste-design.md`
- Create: `tests/weekly.test.ts`

**Interfaces:**
- Consumes: `weekStart`, `nextWeekStart` (Task 1), Tabelle `actions` (Task 2).
- Produces: `state()` liefert `weekBoard: {name:string; points:number}[]`, `weekStart: number`, `weekEnd: number`; `Data` in `lib/cat-types.ts` hat dieselben drei Felder.

- [ ] **Step 1: Failing tests schreiben (`tests/weekly.test.ts`)**

```ts
import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { nextWeekStart, weekStart } from "../lib/week";
import { T0, get, json, register, setTime } from "./helpers";

const WS = weekStart(T0);
type Entry = { name: string; points: number };

async function playerId(name: string): Promise<string> {
  const row = await env.DB!.prepare("SELECT id FROM players WHERE name=?").bind(name).first<{ id: string }>();
  return row!.id;
}
async function addAction(player: string, points: number, at: number, action = "meow") {
  await env.DB!
    .prepare("INSERT INTO actions(player,action,points,at) VALUES(?,?,?,?)")
    .bind(player, action, points, at)
    .run();
}

test("weekStart, weekEnd und leeres weekBoard", async () => {
  setTime(T0);
  const body = await json(await get());
  expect(body.weekStart).toBe(WS);
  expect(body.weekEnd).toBe(nextWeekStart(T0));
  expect(body.weekBoard).toEqual([]);
});

test("weekBoard summiert nur Punkte seit Wochenbeginn und sortiert absteigend", async () => {
  setTime(T0);
  await register("Lisa");
  await register("Tom");
  const lisa = await playerId("Lisa");
  const tom = await playerId("Tom");
  await addAction(lisa, 5, WS - 1000); // Vorwoche zählt nicht
  await addAction(lisa, 5, WS + 1000);
  await addAction(lisa, 3, WS + 2000);
  await addAction(tom, 6, WS + 500);
  setTime(WS + 10_000);
  const body = await json(await get());
  expect(body.weekBoard).toEqual([
    { name: "Lisa", points: 8 },
    { name: "Tom", points: 6 },
  ] satisfies Entry[]);
});

test("bei Gleichstand steht zuerst, wer früher zuletzt Punkte bekam", async () => {
  setTime(T0);
  await register("Lisa");
  await register("Tom");
  await addAction(await playerId("Lisa"), 5, WS + 200);
  await addAction(await playerId("Tom"), 5, WS + 100);
  setTime(WS + 10_000);
  const body = await json(await get());
  expect(body.weekBoard.map((e: Entry) => e.name)).toEqual(["Tom", "Lisa"]);
});

test("nur Konten mit Passwort erscheinen", async () => {
  setTime(T0);
  await register("Lisa");
  await addAction(await playerId("Lisa"), 5, WS + 100);
  await env.DB!.prepare("INSERT INTO players(id,name,points,last) VALUES('ghost','Ghost',0,0)").run();
  await addAction("ghost", 50, WS + 200);
  setTime(WS + 10_000);
  const body = await json(await get());
  expect(body.weekBoard).toEqual([{ name: "Lisa", points: 5 }]);
});

test("höchstens 100 Einträge, die besten zuerst", async () => {
  setTime(T0);
  const statements = [];
  for (let i = 1; i <= 101; i++) {
    statements.push(env.DB!.prepare("INSERT INTO players(id,name,points,last) VALUES(?,?,0,0)").bind("p" + i, "P" + i));
    statements.push(
      env.DB!.prepare("INSERT INTO accounts(player,key,password,joined) VALUES(?,?,?,?)").bind("p" + i, "user:p" + i, "x:y", 0),
    );
    statements.push(
      env.DB!.prepare("INSERT INTO actions(player,action,points,at) VALUES(?,?,?,?)").bind("p" + i, "meow", i, WS + i),
    );
  }
  await env.DB!.batch(statements);
  setTime(WS + 10_000);
  const body = await json(await get());
  expect(body.weekBoard).toHaveLength(100);
  expect(body.weekBoard[0]).toEqual({ name: "P101", points: 101 });
  expect(body.weekBoard[99]).toEqual({ name: "P2", points: 2 });
});

test("abgemeldete Besucher sehen die Wochenwertung", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  await addAction(await playerId("Lisa"), 5, WS + 100);
  setTime(WS + 10_000);
  const anonymous = await json(await get());
  const loggedIn = await json(await get(session));
  expect(anonymous.account).toBe(false);
  expect(anonymous.weekBoard).toEqual([{ name: "Lisa", points: 5 }]);
  expect(loggedIn.weekBoard).toEqual(anonymous.weekBoard);
});

test("nach dem Wochenwechsel startet die Wochenwertung bei null, die Gesamtwertung bleibt", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  await addAction(await playerId("Lisa"), 5, WS + 1000);
  await env.DB!.prepare("UPDATE players SET points=5 WHERE name='Lisa'").run();
  const next = nextWeekStart(WS + 1000);
  setTime(next - 1);
  expect((await json(await get(session))).weekBoard).toEqual([{ name: "Lisa", points: 5 }]);
  setTime(next);
  const after = await json(await get(session));
  expect(after.weekBoard).toEqual([]);
  expect(after.weekStart).toBe(next);
  expect(after.board).toEqual([{ name: "Lisa", points: 5 }]);
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run tests/weekly.test.ts`
Expected: FAIL (`body.weekStart` ist `undefined`).

- [ ] **Step 3: Typen ergänzen (`lib/cat-types.ts`)**

In `Data` am Anfang ergänzen, also `export type Data={weekBoard:Entry[];weekStart:number;weekEnd:number;events:FeedEvent[];playerCount:number;...` (alles andere in der Zeile bleibt wortgleich).

- [ ] **Step 4: `state()` erweitern (`lib/server/state.ts`)**

Vier exakte Ersetzungen, nichts sonst ändern:

1. Import nach der Zeile `import type {Identity} from "./auth";` ergänzen: `import {weekStart,nextWeekStart} from "../week";`
2. Destructuring: `const [,c,r,p,t,rev,team,ev]=await db().batch([` wird zu `const [,c,r,p,t,rev,team,ev,wk]=await db().batch([`
3. Ende des Batches: `ORDER BY e.at DESC,e.id DESC LIMIT 10")]);` wird zu
   `ORDER BY e.at DESC,e.id DESC LIMIT 10"),sql("SELECT p.name AS name,sum(a.points) AS points FROM actions a JOIN players p ON p.id=a.player JOIN accounts ac ON ac.player=p.id WHERE ac.password IS NOT NULL AND a.at>=? GROUP BY a.player ORDER BY sum(a.points) DESC,max(a.at) ASC LIMIT 100",weekStart(now))]);`
4. Im `return {`: `return {events:ev.results,` wird zu `return {weekBoard:wk.results,weekStart:weekStart(now),weekEnd:nextWeekStart(now),events:ev.results,`

- [ ] **Step 5: Spec an die Umsetzung anpassen**

In `docs/superpowers/specs/2026-11-04-wochenrangliste-design.md` im Abschnitt „API“ den Teil `ORDER BY points DESC, max(a.at) ASC LIMIT 100` ändern zu `ORDER BY sum(a.points) DESC, max(a.at) ASC LIMIT 100` (eindeutig, weil auch `players` eine Spalte `points` hat).

- [ ] **Step 6: Tests laufen lassen**

Run: `npm test`
Expected: alle PASS. Bricht ein bestehender Test, weil er den State exakt vergleicht, den Test minimal anpassen (nur die neuen Felder ergänzen) und im Bericht nennen.

- [ ] **Step 7: Prüfungen und Commit**

Run: `npx tsc --noEmit -p .` (0 Zeilen), `npm run lint` (0 Fehler).

```bash
git add lib/server/state.ts lib/cat-types.ts tests/weekly.test.ts docs/superpowers/specs/2026-11-04-wochenrangliste-design.md
git commit -m "weekBoard, weekStart und weekEnd in der API"
```

---

### Task 4: Reiter in der Rangliste, README und lokale Datenbank

**Files:**
- Modify: `components/cat/Leaderboard.tsx`, `app/page.tsx`, `app/globals.css`, `README.md`
- Create: `styles/weekly.css`

**Interfaces:**
- Consumes: `Data.weekBoard`, `Data.weekEnd` (Task 3), `remainingTime` (Task 1).
- Produces: `<Leaderboard data={Data|null} now={number} onRoom={()=>void}/>`.

- [ ] **Step 1: `components/cat/Leaderboard.tsx` ersetzen**

```tsx
"use client";
import {useState,type KeyboardEvent} from "react";
import {Trophy,ArrowUpRight} from "lucide-react";
import type {Data} from "../../lib/cat-types";
import {remainingTime} from "../../lib/format-time";

type Props={data:Data|null;now:number;onRoom:()=>void};
type View="week"|"total";
const views:{id:View;label:string}[]=[{id:"week",label:"Diese Woche"},{id:"total",label:"Gesamt"}];

export function Leaderboard({data,now,onRoom}:Props){
 const [view,setView]=useState<View>("week");
 const list=data?(view==="week"?data.weekBoard:data.board):[];
 function onKeyDown(e:KeyboardEvent){
  if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();const next:View=view==="week"?"total":"week";setView(next);document.getElementById("tab-"+next)?.focus()}
 }
 const intro=view==="week"?"Punkte seit Montag, 0 Uhr. Neue Woche "+(data?remainingTime(data.weekEnd,now):"")+".":"Miauen gibt 1 Punkt, Bürsten 4, Füttern und Streicheln je 5, Spielen 6 und Lernen 8.";
 const empty=view==="week"?"Diese Woche hat noch niemand Punkte gesammelt. Wer gibt Byte den ersten Snack?":"Die Rangliste ist noch leer. Wer gibt Byte den ersten Snack?";
 return <section className="card board"><small><Trophy size={15}/> KURS-CHARTS</small><h2>Die Pfotenpunkte</h2>
  <div className="tabs" role="tablist" aria-label="Zeitraum" onKeyDown={onKeyDown}>{views.map(v=><button key={v.id} id={"tab-"+v.id} role="tab" type="button" aria-selected={view===v.id} aria-controls="board-panel" tabIndex={view===v.id?0:-1} onClick={()=>setView(v.id)}>{v.label}</button>)}</div>
  <div id="board-panel" role="tabpanel" aria-labelledby={"tab-"+view}>{data&&<p>{intro}</p>}{list.length?<ol>{list.map((x,i)=><li key={i}><b>{String(i+1).padStart(2,"0")}</b><span>{x.name}</span><strong>{x.points} Pkt.</strong></li>)}</ol>:<p>{data?empty:"Rangliste lädt …"}</p>}</div>
  <button className="link" onClick={onRoom}>Ins Katzenzimmer <ArrowUpRight size={16}/></button></section>;
}
```

Hinweis: Die Komponente braucht jetzt Zustand und ist deshalb mit `"use client"` markiert; andere Komponenten in `components/cat/` tun das nur, wenn sie Hooks nutzen. Fehlt die Direktive nicht, ist sie harmlos; `app/page.tsx` ist selbst ein Client-Modul.

- [ ] **Step 2: `now` in `app/page.tsx` durchreichen**

Genau eine Ersetzung in der Zeile mit der Rangliste: `<Leaderboard data={data} onRoom=` wird zu `<Leaderboard data={data} now={now} onRoom=`. Nichts sonst in der Datei ändern.

- [ ] **Step 3: Stil `styles/weekly.css` anlegen und importieren**

```css
/* Reiter „Diese Woche“ / „Gesamt“ in der Rangliste. */
.board .tabs {
  display:flex;
  gap:8px;
  margin:0 0 14px
}

.board .tabs button {
  padding:8px 14px;
  border:2px solid #312e2c;
  border-radius:999px;
  background:#fffdf6;
  font-size:13px;
  font-weight:700;
  cursor:pointer
}

.board .tabs button[aria-selected="true"] {
  background:#ffbe77
}
```

In `app/globals.css` als **letzte** Zeile ergänzen: `@import "../styles/weekly.css";`

- [ ] **Step 4: README ergänzen**

Im Abschnitt „Datenbank einrichten“ nach dem bestehenden Absatz zu `0005` (oder dem allgemeinen Hinweis zu neuen Migrationen) kurz (deutsch) ergänzen: Mit der Wochen-Rangliste kommt eine weitere Migration (`drizzle/0006_<name>.sql`, echten Namen aus `ls drizzle` einsetzen), die auf eine **bestehende** lokale Datenbank wie die vorherige einzeln eingespielt wird; ohne sie antwortet `GET /api/cat` mit 500 (`no such table: actions`). Beim späteren Einrichten eines Hostings müssen die Migrationen `0000` bis `0006` der Reihe nach laufen.

- [ ] **Step 5: Lokale Entwicklungsdatenbank migrieren**

Der laufende Dev-Server nutzt `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<64hex>.sqlite` (nicht `metadata.sqlite`; mit `ls` den Namen finden). Das ist die echte lokale Datenbank des Nutzers. Die Migration ist rein additiv (neue Tabelle und zwei Indizes). Vorgehen:

1. Backup: `sqlite3 <db> ".backup '/private/tmp/claude-501/-Users-jonas-Documents-Claude-Kurskatze-wwi25a2-kurskatze/7a4d57cf-a6ec-475f-a9c7-82677e75832e/scratchpad/db-before-actions.sqlite'"`
2. Vorher: `sqlite3 <db> ".tables"` (kein `actions`) und `SELECT count(*) FROM players` notieren.
3. Nur die neue Datei einspielen: `sed 's/--> statement-breakpoint//' drizzle/0006_<name>.sql | sqlite3 <db>`
4. Nachher: `.tables` zeigt `actions`, `players`-Zählung unverändert.
5. `curl -s http://127.0.0.1:5173/api/cat | head -c 600` liefert JSON mit `"weekBoard":` (Dev-Server nicht neu starten, er lädt per HMR nach).

Keine Konten oder sonstigen Daten anlegen (nur GET).

- [ ] **Step 6: Prüfungen**

Run: `npm test` (alle PASS), `npx tsc --noEmit -p .` (0 Zeilen), `npm run lint` (0 Fehler, keine neue Warnung außer den bekannten), `npm run build` (erfolgreich).

- [ ] **Step 7: Commit**

```bash
git add components/cat/Leaderboard.tsx app/page.tsx styles/weekly.css app/globals.css README.md
git commit -m "Reiter Diese Woche und Gesamt in der Rangliste"
```
