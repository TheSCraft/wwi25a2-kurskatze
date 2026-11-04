# Kurs-Ziele und Freischaltungen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Kurs erreicht gemeinsame Ziele (Miauen, Aktionen, Punkte, Wiederbelebungen). Jedes Ziel gibt ein Abzeichen, manche schalten einen Titel für Byte oder eine Optik frei. Erreichte Ziele stehen mit Datum im Aktivitäts-Feed.

**Architecture:** Feste Zielliste und reine Funktionen in `lib/goals.ts`. Neue Tabelle `goals_reached`, neue Spalten `cat.actions` (mitgeführter Zähler, im Aktions-Batch hochgezählt) und `events.detail`. `state()` erkennt beim Abruf neu erreichte Ziele und schreibt sie idempotent (`INSERT OR IGNORE`). Der Client leitet Titel und Optik aus den erreichten Zielen ab.

**Tech Stack:** Next 16 / vinext, React 19, Cloudflare D1 + Drizzle (nur Schema/Migration), Vitest mit `@cloudflare/vitest-plugin`, lucide-react.

**Spec:** `docs/superpowers/specs/2026-11-05-kursziele-design.md`

## Global Constraints

- Node `>=22.13.0` ist nötig. Auf dem Entwicklerrechner läuft Node 20, deshalb jedes Kommando mit `export PATH=/private/tmp/claude-501/-Users-jonas-Documents-Claude-Kurskatze-wwi25a2-kurskatze/7a4d57cf-a6ec-475f-a9c7-82677e75832e/scratchpad/node22/node_modules/node/bin:$PATH` vorstellen.
- Keine neuen Pakete. `package.json` und `pnpm-lock.yaml` bleiben unverändert.
- Spielregeln und `lib/cat-rules.ts` bleiben unverändert. Die Optiken sind nur kosmetisch.
- Die zwölf Ziele genau wie in der Spec (Ids, Schwellen, Abzeichen-Namen, Titel, Optiken). Titel-Reihenfolge `points-10000`, `points-2500`, `points-500`, sonst „Kurskatze“.
- Migration `0007` mit `npx drizzle-kit generate`, Migration `0008` (Rückfüllung) mit `npx drizzle-kit generate --custom --name=backfill_actions_counter`. Keine generierte Datei von Hand ändern außer dem Füllen der leeren Custom-Datei.
- Im `UPDATE cat` von `lib/server/actions/interact.ts` ändert sich nur `calls=calls+? WHERE id=1 AND changes()>0` zu `calls=calls+?,actions=actions+1 WHERE id=1 AND changes()>0`. Die übrigen Anweisungen im Batch bleiben wortgleich.
- Feed-Eintrag für ein Ziel: Typ `goal`, Schlüssel `goal:<id>`, `detail = <id>`, `player` leer. Text: „Kursziel erreicht: <Abzeichen>“ (unbekannte Id: „Kursziel erreicht“).
- CSS in neuer Datei `styles/goals.css`, in `app/globals.css` als **letzte** Zeile importiert.
- Commits nur auf dem Branch `kursziele`, nie pushen. Commit-Trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Nicht anfassen: `scripts/`, `vendor/`, `worker/`, `examples/`, `components/ui/`, bestehende Migrationen `drizzle/0000`–`0006`, `components/stickerbox.tsx`, `lib/sticker-*.ts`, `lib/meow-sound.ts`, `lib/cat-rules.ts`.
- Lint 0 Fehler (drei `no-img-element`-Warnungen sind bekannt), `npx tsc --noEmit -p .` 0 Zeilen.
- Die lokale Entwicklungsdatenbank des Nutzers (`.wrangler/...`) wird nur in Task 5 und nur mit Backup migriert. Bis dahin antwortet der Dev-Server auf `/api/cat` mit 500, das ist erwartet.
- Arbeitet ein Task in einem separaten Git-Worktree, legt er `node_modules` per Symlink an und committet nur dort; der Controller übernimmt den Commit per `cherry-pick`.

## File Structure

```
lib/goals.ts                         Ziele, newlyReached, unlockedTitle, unlockedEffects, nextGoal, goalById
lib/cat-types.ts                     FeedEvent erweitert, Data.goals
tests/goals.test.ts                  reine Funktionen
db/schema.ts                         cat.actions, events.detail, Tabelle goalsReached
drizzle/0007_*.sql, 0008_*.sql       generiert (0008 per --custom)
tests/setup.ts                       goals_reached leeren, Migrationscheck
lib/server/actions/interact.ts       actions=actions+1
tests/counters.test.ts               Zähler und Rückfüllung
lib/server/state.ts                  Zähler lesen, Ziele erkennen und schreiben, detail im Feed
tests/goals-state.test.ts            Erkennen, Idempotenz, Feed
components/cat/GoalsCard.tsx         Karte Kursziele
components/cat/ActivityCard.tsx      Text für goal
components/cat/CatStage.tsx          Prop effects, Klassen fx-*
app/page.tsx                         Titel, Effekte, Karte einbinden
styles/goals.css                     Karte und Optiken
app/globals.css                      + @import
README.md                            Migrationen 0007/0008
```

---

### Task 1: Ziele, reine Funktionen und Typen

**Files:**
- Create: `lib/goals.ts`, `tests/goals.test.ts`
- Modify: `lib/cat-types.ts`

**Interfaces:**
- Produces:
  - `type Counters = {calls:number; actions:number; points:number; revivals:number}`, `type GoalKind = keyof Counters`, `type Effect = "gold-bowl"|"stars"|"sunrise"|"glow"`, `type Goal = {id:string; kind:GoalKind; target:number; badge:string; icon:string; title?:string; effect?:Effect}`
  - `goals: Goal[]` (die zwölf Ziele), `defaultTitle = "Kurskatze"`
  - `newlyReached(counters:Counters, reachedIds:Iterable<string>): Goal[]`, `unlockedTitle(reachedIds:Iterable<string>): string`, `unlockedEffects(reachedIds:Iterable<string>): Effect[]`, `nextGoal(kind:GoalKind, reachedIds:Iterable<string>): Goal|undefined`, `goalById(id:string): Goal|undefined`
  - `lib/cat-types.ts`: `FeedEvent` mit `type` inklusive `"goal"` und `detail: string|null`; `Data.goals: {counters: Counters; reached: Record<string, number>}`

- [ ] **Step 1: Failing tests schreiben (`tests/goals.test.ts`)**

```ts
import { expect, test } from "vitest";
import { defaultTitle, goalById, goals, nextGoal, newlyReached, unlockedEffects, unlockedTitle } from "../lib/goals";

const zero = { calls: 0, actions: 0, points: 0, revivals: 0 };

test("zwölf Ziele mit eindeutigen Ids", () => {
  expect(goals).toHaveLength(12);
  expect(new Set(goals.map((g) => g.id)).size).toBe(12);
  expect(goalById("calls-500")).toMatchObject({ kind: "calls", target: 500, badge: "Lautstarker Kurs", effect: "stars" });
  expect(goalById("gibt-es-nicht")).toBeUndefined();
});

test("newlyReached: Grenze 99 gegen 100, genau auf der Schwelle", () => {
  expect(newlyReached({ ...zero, calls: 99 }, [])).toEqual([]);
  expect(newlyReached({ ...zero, calls: 100 }, []).map((g) => g.id)).toEqual(["calls-100"]);
});

test("newlyReached: mehrere Ziele auf einmal und bereits erreichte werden ausgeschlossen", () => {
  const counters = { calls: 2500, actions: 60, points: 0, revivals: 1 };
  expect(newlyReached(counters, []).map((g) => g.id)).toEqual(["calls-100", "calls-500", "actions-50", "revivals-1"]);
  expect(newlyReached(counters, ["calls-100", "revivals-1"]).map((g) => g.id)).toEqual(["calls-500", "actions-50"]);
  expect(newlyReached(counters, new Set(["calls-100", "calls-500", "actions-50", "revivals-1"]))).toEqual([]);
});

test("unlockedTitle: höchster Titel, sonst Kurskatze", () => {
  expect(unlockedTitle([])).toBe(defaultTitle);
  expect(defaultTitle).toBe("Kurskatze");
  expect(unlockedTitle(["points-500"])).toBe("Hörsaal-Stammgast");
  expect(unlockedTitle(["points-500", "points-2500"])).toBe("Dozent h. c.");
  expect(unlockedTitle(["points-2500", "points-10000", "points-500"])).toBe("Professor Byte");
  expect(unlockedTitle(["calls-100", "actions-50"])).toBe("Kurskatze");
});

test("unlockedEffects: nur Optiken erreichter Ziele in Zielreihenfolge", () => {
  expect(unlockedEffects([])).toEqual([]);
  expect(unlockedEffects(["calls-500", "calls-100", "points-500"])).toEqual(["gold-bowl", "stars"]);
  expect(unlockedEffects(goals.map((g) => g.id))).toEqual(["gold-bowl", "stars", "sunrise", "glow"]);
});

test("nextGoal: nächstes offenes Ziel je Messgröße", () => {
  expect(nextGoal("calls", [])?.id).toBe("calls-100");
  expect(nextGoal("calls", ["calls-100", "calls-500"])?.id).toBe("calls-2000");
  expect(nextGoal("revivals", ["revivals-1", "revivals-3"])).toBeUndefined();
  expect(nextGoal("points", ["points-500"])?.target).toBe(2500);
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run tests/goals.test.ts`
Expected: FAIL (`lib/goals` existiert nicht).

- [ ] **Step 3: `lib/goals.ts` anlegen**

```ts
export type Counters = { calls: number; actions: number; points: number; revivals: number };
export type GoalKind = keyof Counters;
export type Effect = "gold-bowl" | "stars" | "sunrise" | "glow";
export type Goal = {
  id: string;
  kind: GoalKind;
  target: number;
  badge: string;
  icon: string;
  title?: string;
  effect?: Effect;
};

export const defaultTitle = "Kurskatze";

// Zielleiter des Kurses. Die Schwellen sind geschätzt (etwa 30 Konten) und hier an einer Stelle änderbar.
export const goals: Goal[] = [
  { id: "calls-100", kind: "calls", target: 100, badge: "Erste Miau-Runde", icon: "Megaphone", effect: "gold-bowl" },
  { id: "calls-500", kind: "calls", target: 500, badge: "Lautstarker Kurs", icon: "Volume2", effect: "stars" },
  { id: "calls-2000", kind: "calls", target: 2000, badge: "Miau-Chor", icon: "Music", effect: "sunrise" },
  { id: "calls-10000", kind: "calls", target: 10000, badge: "Legendäres Miau", icon: "Crown", effect: "glow" },
  { id: "actions-50", kind: "actions", target: 50, badge: "Fleißiger Kurs", icon: "Fish" },
  { id: "actions-250", kind: "actions", target: 250, badge: "Vollzeit-Pfleger", icon: "Brush" },
  { id: "actions-1000", kind: "actions", target: 1000, badge: "Dauerbetreuung", icon: "Gamepad2" },
  { id: "points-500", kind: "points", target: 500, badge: "Hörsaal-Stammgast", icon: "GraduationCap", title: "Hörsaal-Stammgast" },
  { id: "points-2500", kind: "points", target: 2500, badge: "Dozent h. c.", icon: "BookOpen", title: "Dozent h. c." },
  { id: "points-10000", kind: "points", target: 10000, badge: "Professor Byte", icon: "Award", title: "Professor Byte" },
  { id: "revivals-1", kind: "revivals", target: 1, badge: "Gemeinsam gerettet", icon: "LifeBuoy" },
  { id: "revivals-3", kind: "revivals", target: 3, badge: "Neun Leben", icon: "Sparkles" },
];

const titleOrder = ["points-10000", "points-2500", "points-500"];

export function goalById(id: string): Goal | undefined {
  return goals.find((g) => g.id === id);
}

// Ziele, deren Zähler die Schwelle erreicht hat und die noch nicht erreicht gespeichert sind.
export function newlyReached(counters: Counters, reachedIds: Iterable<string>): Goal[] {
  const done = new Set(reachedIds);
  return goals.filter((g) => !done.has(g.id) && counters[g.kind] >= g.target);
}

export function unlockedTitle(reachedIds: Iterable<string>): string {
  const done = new Set(reachedIds);
  for (const id of titleOrder) {
    if (done.has(id)) return goalById(id)!.title!;
  }
  return defaultTitle;
}

export function unlockedEffects(reachedIds: Iterable<string>): Effect[] {
  const done = new Set(reachedIds);
  return goals.filter((g) => g.effect && done.has(g.id)).map((g) => g.effect!);
}

export function nextGoal(kind: GoalKind, reachedIds: Iterable<string>): Goal | undefined {
  const done = new Set(reachedIds);
  return goals.find((g) => g.kind === kind && !done.has(g.id));
}
```

- [ ] **Step 4: Typen ergänzen (`lib/cat-types.ts`)**

Die Datei bekommt oben `import type {Counters} from "./goals";`. Die Zeile mit `FeedEvent` wird zu

`export type FeedEvent={id:number;type:"joined"|"revive_portion"|"revived"|"died"|"goal";at:number;name:string|null;detail:string|null};`

und in `Data` am Anfang ergänzen: `goals:{counters:Counters;reached:Record<string,number>};` (also `export type Data={goals:{counters:Counters;reached:Record<string,number>};weekBoard:Entry[];...`, alles andere wortgleich).

- [ ] **Step 5: Tests und Prüfungen**

Run: `npx vitest run tests/goals.test.ts` (PASS), dann `npm test` (alle PASS), `npx tsc --noEmit -p .` (0 Zeilen), `npm run lint` (0 Fehler). Der `switch` in `components/cat/ActivityCard.tsx` hat für den neuen Typ `goal` noch keinen Zweig; das ist in Task 4 geplant und darf `tsc` hier nicht brechen (sonst den Fehler melden).

- [ ] **Step 6: Commit**

```bash
git add lib/goals.ts lib/cat-types.ts tests/goals.test.ts
git commit -m "Zielleiter und reine Funktionen für die Kursziele"
```

---

### Task 2: Schema, Migrationen und Aktionszähler

**Files:**
- Modify: `db/schema.ts`, `tests/setup.ts`, `lib/server/actions/interact.ts`
- Create: `drizzle/0007_*.sql`, `drizzle/0008_backfill_actions_counter.sql`, Meta-Dateien (generiert), `tests/counters.test.ts`

**Interfaces:**
- Produces: Tabelle `goals_reached(goal pk, at)`, Spalte `cat.actions` (Standard 0), Spalte `events.detail`; jede angenommene Aktion erhöht `cat.actions` um 1.

- [ ] **Step 1: Failing tests schreiben (`tests/counters.test.ts`)**

```ts
import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { T0, act, get, register, setTime } from "./helpers";

const SECOND = 1000;

const backfill = import.meta.glob("../drizzle/*backfill_actions_counter.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

async function counters() {
  return (await env.DB!.prepare("SELECT actions,calls FROM cat WHERE id=1").first()) as { actions: number; calls: number };
}

async function ready() {
  setTime(T0);
  const { session } = await register("Lisa");
  await get(session);
  setTime(T0 + 6 * SECOND);
  return session;
}

test("eine angenommene Aktion erhöht cat.actions, Miauen zusätzlich cat.calls", async () => {
  const session = await ready();
  expect(await counters()).toEqual({ actions: 0, calls: 0 });
  expect((await act(session, "food")).status).toBe(200);
  expect(await counters()).toEqual({ actions: 1, calls: 0 });
  setTime(T0 + 12 * SECOND);
  expect((await act(session, "meow")).status).toBe(200);
  expect(await counters()).toEqual({ actions: 2, calls: 1 });
});

test("abgelehnte Aktionen erhöhen cat.actions nicht", async () => {
  const session = await ready();
  await act(session, "food");
  setTime(T0 + 8 * SECOND); // gemeinsame Pause
  expect((await act(session, "love")).status).toBe(429);
  setTime(T0 + 20 * SECOND); // gleiche Aktion: Cooldown
  expect((await act(session, "food")).status).toBe(429);
  expect((await counters()).actions).toBe(1);
});

test("Rückfüllung: cat.actions entspricht danach der Zahl der Protokollzeilen", async () => {
  const session = await ready();
  await act(session, "food");
  setTime(T0 + 12 * SECOND);
  await act(session, "meow");
  const file = Object.values(backfill);
  expect(file).toHaveLength(1);
  await env.DB!.prepare("UPDATE cat SET actions=0").run();
  for (const statement of file[0].split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean)) {
    await env.DB!.prepare(statement).run();
  }
  expect((await counters()).actions).toBe(2);
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run tests/counters.test.ts`
Expected: FAIL (`no such column: actions`).

- [ ] **Step 3: Schema ändern (`db/schema.ts`)**

Drei exakte Ersetzungen:

1. In der Zeile `export const cat=...`: `calls:integer("calls").notNull(),active:` wird zu `calls:integer("calls").notNull(),actions:integer("actions").notNull().default(0),active:`
2. In der Zeile `export const events=...`: `at:integer("at").notNull()},(t)=>[index("events_at_idx")` wird zu `at:integer("at").notNull(),detail:text("detail")},(t)=>[index("events_at_idx")`
3. Am Dateiende anhängen:

```ts

export const goalsReached=sqliteTable("goals_reached",{goal:text("goal").primaryKey(),at:integer("at").notNull()});
```

- [ ] **Step 4: Migrationen erzeugen**

Run: `npx drizzle-kit generate`
Expected: `drizzle/0007_<name>.sql` mit `CREATE TABLE \`goals_reached\``, `ALTER TABLE \`cat\` ADD \`actions\` integer DEFAULT 0 NOT NULL` und `ALTER TABLE \`events\` ADD \`detail\` text` (plus Meta). Dann:

Run: `npx drizzle-kit generate --custom --name=backfill_actions_counter`
Expected: eine leere Datei `drizzle/0008_backfill_actions_counter.sql` (plus Journal-Eintrag). Inhalt der Datei (Zeile ersetzen):

```sql
UPDATE `cat` SET `actions`=(SELECT count(*) FROM `actions`);
```

Fragt `drizzle-kit` interaktiv etwas, abbrechen und melden.

- [ ] **Step 5: `tests/setup.ts` anpassen**

```ts
// alt:
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='actions'")
// neu:
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='goals_reached'")
```

```ts
// alt:
    ["cooldowns", "sessions", "accounts", "players", "cat", "login_attempts", "events", "actions"].map((t) =>
// neu:
    ["cooldowns", "sessions", "accounts", "players", "cat", "login_attempts", "events", "actions", "goals_reached"].map((t) =>
```

- [ ] **Step 6: Zähler im Aktions-Batch (`lib/server/actions/interact.ts`)**

Genau eine Ersetzung im `UPDATE cat`: `calls=calls+? WHERE id=1 AND changes()>0` wird zu `calls=calls+?,actions=actions+1 WHERE id=1 AND changes()>0`. Die gebundenen Werte, die übrigen drei Anweisungen und alles andere bleiben byte-identisch.

- [ ] **Step 7: Tests laufen lassen**

Run: `npm test`
Expected: alle PASS (bisherige und `tests/counters.test.ts`).

- [ ] **Step 8: Prüfungen und Commit**

Run: `npx tsc --noEmit -p .` (0 Zeilen), `npm run lint` (0 Fehler).

```bash
git add db/schema.ts drizzle tests/setup.ts tests/counters.test.ts lib/server/actions/interact.ts
git commit -m "Tabelle goals_reached, Spalten cat.actions und events.detail, Aktionszähler"
```

---

### Task 3: Erkennen und Eintragen in `state()`

**Files:**
- Modify: `lib/server/state.ts`
- Create: `tests/goals-state.test.ts`

**Interfaces:**
- Consumes: `newlyReached`, `Counters` (Task 1); `goals_reached`, `cat.actions`, `events.detail` (Task 2).
- Produces: `state()` liefert `goals: {counters: Counters; reached: Record<string, number>}`, die Feed-Einträge enthalten `detail`; neu erreichte Ziele stehen danach in `goals_reached` und als Feed-Eintrag `goal`.

- [ ] **Step 1: Failing tests schreiben (`tests/goals-state.test.ts`)**

```ts
import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { T0, act, get, json, post, register, setTime } from "./helpers";

const SECOND = 1000;
const LIFETIME = 72 * 60 * 60 * 1000;

type Ev = { type: string; at: number; name: string | null; detail: string | null };
const goalEvents = (events: Ev[]) => events.filter((e) => e.type === "goal");

async function count(table: string) {
  return ((await env.DB!.prepare(`SELECT count(*) AS n FROM ${table}`).first()) as { n: number }).n;
}

test("goals: Zähler und leere erreichte Liste am Anfang", async () => {
  setTime(T0);
  const body = await json(await get());
  expect(body.goals).toEqual({ counters: { calls: 0, actions: 0, points: 0, revivals: 0 }, reached: {} });
});

test("eine Miau-Aktion über der Schwelle trägt calls-100 mit Zeitpunkt und genau einen Feed-Eintrag ein", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  await get(session);
  await env.DB!.prepare("UPDATE cat SET calls=99").run();
  setTime(T0 + 6 * SECOND);
  const res = await act(session, "meow");
  expect(res.status).toBe(200);
  const body = await json(res);
  expect(body.goals.counters).toMatchObject({ calls: 100, actions: 1 });
  expect(body.goals.reached).toEqual({ "calls-100": T0 + 6 * SECOND });
  expect(goalEvents(body.events)).toMatchObject([{ type: "goal", at: T0 + 6 * SECOND, detail: "calls-100", name: null }]);
  // wiederholter Abruf: keine zweite Eintragung
  setTime(T0 + 60 * SECOND);
  const again = await json(await get(session));
  expect(again.goals.reached).toEqual({ "calls-100": T0 + 6 * SECOND });
  expect(goalEvents(again.events)).toHaveLength(1);
  expect(await count("goals_reached")).toBe(1);
});

test("gleichzeitige Abrufe tragen ein erreichtes Ziel nur einmal ein", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  await get(session);
  await env.DB!.prepare("UPDATE cat SET calls=100").run();
  await Promise.all([get(session), get(session), get(session)]);
  expect(await count("goals_reached")).toBe(1);
  expect(await count("events WHERE type='goal'")).toBe(1);
});

test("mehrere Ziele auf einmal: je ein Eintrag", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  await get(session);
  await env.DB!.prepare("UPDATE cat SET calls=2500, actions=60").run();
  const body = await json(await get(session));
  expect(Object.keys(body.goals.reached).sort()).toEqual(["actions-50", "calls-100", "calls-2000", "calls-500"]);
  expect(goalEvents(body.events)).toHaveLength(4);
});

test("Punkte-Ziel: Summe der Konten-Punkte", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  await env.DB!.prepare("UPDATE players SET points=500 WHERE name='Lisa'").run();
  const body = await json(await get(session));
  expect(body.goals.counters.points).toBe(500);
  expect(Object.keys(body.goals.reached)).toEqual(["points-500"]);
});

test("Wiederbelebungs-Ziel: revivals-1 nach der gemeinsamen Futterrunde", async () => {
  setTime(T0);
  const a = (await register("Lisa")).session;
  const b = (await register("Tom")).session;
  await get(a);
  setTime(T0 + LIFETIME);
  const round = (await json(await get(a))).foodExpires as number;
  await post({ action: "revive", round }, a);
  const last = await json(await post({ action: "revive", round }, b));
  expect(last.goals.counters.revivals).toBe(1);
  expect(Object.keys(last.goals.reached)).toEqual(["revivals-1"]);
  expect(goalEvents(last.events)).toMatchObject([{ detail: "revivals-1" }]);
});

test("Ziele sind auch abgemeldet sichtbar", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  await env.DB!.prepare("UPDATE cat SET calls=100").run();
  await get(session);
  const anonymous = await json(await get());
  expect(anonymous.account).toBe(false);
  expect(anonymous.goals.reached["calls-100"]).toBe(T0);
});
```

Hinweis zum Wiederbelebungs-Test: Bei zwei Konten ist die zweite Portion die letzte; falls die Reihenfolge der Stimmen in der Lebensfrist anders zählt, sind die Erwartungen aus `tests/events.test.ts` (Test „die letzte Portion schreibt revived“) maßgeblich.

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run tests/goals-state.test.ts`
Expected: FAIL (`body.goals` ist `undefined`).

- [ ] **Step 3: `state()` erweitern (`lib/server/state.ts`)**

Die Datei wird an diesen Stellen geändert, alles andere bleibt byte-identisch (die lange Batch-Zeile nur an den genannten Teilen):

1. Import nach `import {weekStart,nextWeekStart} from "../week";` ergänzen: `import {newlyReached,type Counters} from "../goals";`
2. Nach der Konstante `weekBoardSql` zwei Konstanten ergänzen:

```ts
export const feedSql="SELECT e.id AS id,e.type AS type,e.at AS at,p.name AS name,e.detail AS detail FROM events e LEFT JOIN players p ON p.id=e.player ORDER BY e.at DESC,e.id DESC LIMIT 10";
const goalsSql="SELECT goal,at FROM goals_reached";
```

3. Im Batch die bisherige Feed-Anweisung `sql("SELECT e.id AS id,e.type AS type,e.at AS at,p.name AS name FROM events e LEFT JOIN players p ON p.id=e.player ORDER BY e.at DESC,e.id DESC LIMIT 10")` ersetzen durch `sql(feedSql)`.
4. Die `cat`-Abfrage `sql("SELECT food_expires AS food,love,calls,active FROM cat WHERE id=1")` wird zu `sql("SELECT food_expires AS food,love,calls,actions,active FROM cat WHERE id=1")`.
5. Ende der Batch-Liste: `,sql(weekBoardSql,weekStart(now))]);` wird zu `,sql(weekBoardSql,weekStart(now)),sql("SELECT coalesce(sum(p.points),0) AS points FROM players p JOIN accounts ac ON ac.player=p.id WHERE ac.password IS NOT NULL"),sql("SELECT count(*) AS n FROM events WHERE type='revived'"),sql(goalsSql)]);`
6. Destructuring: `const [,c,r,p,t,rev,team,ev,wk]=await db().batch([` wird zu `const [,c,r,p,t,rev,team,ev,wk,pt,rv,gr]=await db().batch([`.
7. Die Zeile `const cat=c.results[0] as {food:number;love:number;calls:number;active:number};` wird zu `const cat=c.results[0] as {food:number;love:number;calls:number;actions:number;active:number};`
8. Direkt nach dieser Zeile einfügen:

```ts
 const counters:Counters={calls:cat.calls,actions:cat.actions,points:Number((pt.results[0] as {points:number}).points),revivals:Number((rv.results[0] as {n:number}).n)};
 let reached=gr.results as {goal:string;at:number}[];
 let events=ev.results;
 const fresh=newlyReached(counters,reached.map(g=>g.goal));
 if(fresh.length){
  // Neu erreichte Ziele einmalig eintragen (idempotent über die eindeutigen Schlüssel) und die Antwort aktualisieren.
  const writes=fresh.flatMap(g=>[sql("INSERT OR IGNORE INTO goals_reached(goal,at) VALUES(?,?)",g.id,now),sql("INSERT OR IGNORE INTO events(key,type,player,at,detail) VALUES(?,'goal',NULL,?,?)","goal:"+g.id,now,g.id)]);
  const res=await db().batch([...writes,sql(goalsSql),sql(feedSql)]);
  reached=res[res.length-2].results as {goal:string;at:number}[];
  events=res[res.length-1].results;
 }
```

9. Im `return {`: `return {weekBoard:wk.results,` wird zu `return {goals:{counters,reached:Object.fromEntries(reached.map(g=>[g.goal,g.at]))},weekBoard:wk.results,` und `events:ev.results,` wird zu `events,`.

- [ ] **Step 4: Tests laufen lassen**

Run: `npm test`
Expected: alle PASS. Bricht ein bestehender Test, weil er den State oder die Feed-Einträge exakt vergleicht, den Test minimal anpassen (nur `goals` bzw. `detail` ergänzen) und im Bericht nennen.

- [ ] **Step 5: Prüfungen und Commit**

Run: `npx tsc --noEmit -p .` (0 Zeilen), `npm run lint` (0 Fehler).

```bash
git add lib/server/state.ts tests/goals-state.test.ts
git commit -m "Kursziele beim Abruf erkennen, eintragen und im Feed melden"
```

---

### Task 4: Oberfläche (Karte, Titel, Optik, Feed-Text)

**Files:**
- Create: `components/cat/GoalsCard.tsx`, `styles/goals.css`
- Modify: `components/cat/ActivityCard.tsx`, `components/cat/CatStage.tsx`, `app/page.tsx`, `app/globals.css`

**Interfaces:**
- Consumes: `goals`, `nextGoal`, `goalById`, `unlockedTitle`, `unlockedEffects`, `GoalKind` (Task 1); `Data.goals`, `FeedEvent.detail` (Task 1).
- Produces: `<GoalsCard data={Data["goals"]|undefined}/>`, `<CatStage ... effects={string[]}/>`.

- [ ] **Step 1: `components/cat/GoalsCard.tsx` anlegen**

```tsx
import {Target,Megaphone,Volume2,Music,Crown,Fish,Brush,Gamepad2,GraduationCap,BookOpen,Award,LifeBuoy,Sparkles,type LucideIcon} from "lucide-react";
import type {Data} from "../../lib/cat-types";
import {goals,nextGoal,type GoalKind} from "../../lib/goals";

const icons:Record<string,LucideIcon>={Megaphone,Volume2,Music,Crown,Fish,Brush,Gamepad2,GraduationCap,BookOpen,Award,LifeBuoy,Sparkles};
const labels:Record<GoalKind,string>={calls:"Miauen",actions:"Aktionen",points:"Pfotenpunkte",revivals:"Wiederbelebungen"};
const kinds:GoalKind[]=["calls","actions","points","revivals"];
const format=(n:number)=>n.toLocaleString("de-DE");

type Props={data:Data["goals"]|undefined};

export function GoalsCard({data}:Props){
 const reached=data?Object.keys(data.reached):[];
 return <section className="card goals"><small><Target size={14}/> KURSZIELE</small><h2>Unser Kurs</h2>{!data?<p>Kursziele laden …</p>:<>
  <ul className="goalbars">{kinds.map(kind=>{const next=nextGoal(kind,reached);const value=data.counters[kind];return <li key={kind}>{next?<><div><span>{labels[kind]}</span><b>{format(value)} / {format(next.target)}</b></div><div className="track"><i style={{width:Math.min(100,Math.round(value*100/next.target))+"%"}}/></div></>:<div><span>{labels[kind]}</span><b>Alles geschafft</b></div>}</li>})}</ul>
  <p className="badgecount">Abzeichen {reached.length} von {goals.length}</p>
  <ul className="badges" aria-label="Abzeichen">{goals.map(g=>{const at=data.reached[g.id];const Icon=icons[g.icon]||Award;return <li key={g.id} className={at?"got":"open"} title={g.badge+(at?" · erreicht am "+new Date(at).toLocaleDateString("de-DE"):" · noch offen")}><Icon size={18} aria-hidden="true"/><span className="sr">{g.badge}{at?", erreicht":", noch offen"}</span></li>})}</ul>
 </>}</section>;
}
```

Alle Icon-Namen müssen im installierten `lucide-react` existieren (`tsc` prüft das). Fehlt einer, durch ein vorhandenes ersetzen und in `lib/goals.ts` den `icon`-String anpassen (im Bericht nennen).

- [ ] **Step 2: Feed-Text in `components/cat/ActivityCard.tsx`**

Import ergänzen: `import {goalById} from "../../lib/goals";`. In `describe` vor der schließenden Klammer des `switch` einen Zweig ergänzen:

```ts
  case "goal":{const g=e.detail?goalById(e.detail):undefined;return g?"Kursziel erreicht: "+g.badge:"Kursziel erreicht"}
```

Außerdem im Leerzustand den Text unverändert lassen.

- [ ] **Step 3: Optik-Klassen in `components/cat/CatStage.tsx`**

`type Props={dead:boolean;message:string;pose:string;audio:boolean;onToggleAudio:()=>void};` wird zu `type Props={dead:boolean;message:string;pose:string;audio:boolean;effects:string[];onToggleAudio:()=>void};`, die Funktionssignatur `{dead,message,pose,audio,onToggleAudio}` zu `{dead,message,pose,audio,effects,onToggleAudio}` und `className={dead?"stage memorial":"stage"}` zu `className={(dead?"stage memorial":"stage")+effects.map(x=>" fx-"+x).join("")}`. Sonst nichts ändern.

- [ ] **Step 4: `app/page.tsx` anpassen**

Genau diese Änderungen, nichts sonst:
1. Imports ergänzen: `import {GoalsCard} from "../components/cat/GoalsCard";` und `import {unlockedTitle,unlockedEffects} from "../lib/goals";`
2. Nach der Zeile `const dead=isDead(data,now);` einfügen: `const reachedIds=data?Object.keys(data.goals.reached):[];`
3. `<CatStage dead={dead} message={message} pose={pose} audio={audio} onToggleAudio={toggleSound}/>` wird zu `<CatStage dead={dead} message={message} pose={pose} audio={audio} effects={unlockedEffects(reachedIds)} onToggleAudio={toggleSound}/>`
4. `<span className="tag">KURSKATZE</span>` wird zu `<span className="tag">{unlockedTitle(reachedIds).toLocaleUpperCase("de")}</span>`
5. `<ActivityCard events={data?.events} now={now}/></aside>` wird zu `<ActivityCard events={data?.events} now={now}/>\n<GoalsCard data={data?.goals}/></aside>`

- [ ] **Step 5: Stil `styles/goals.css` anlegen und importieren**

Vorher `styles/cards.css` (Klassen `.track`, `.card`, `.meter`) und `styles/stage.css` (Bühne `.stage`, Katze `.cat`, `.bowl`, `.speech`, Pseudo-Elemente und Stapelreihenfolge) lesen und die Effekte so legen, dass sie hinter der Katze und der Sprechblase liegen und kein Layout ändern.

```css
/* Karte „Kursziele“ und Optik-Freischaltungen auf der Bühne. */
.goals ul {
  padding:0;
  margin:0;
  list-style:none
}

.goalbars li {
  margin-bottom:12px
}

.goalbars li > div:first-child {
  display:flex;
  justify-content:space-between;
  gap:8px;
  font-size:14px
}

.goalbars .track {
  margin-top:6px
}

.goals .badgecount {
  margin:14px 0 8px;
  color:#5a564d;
  font-size:13px
}

.badges {
  display:flex;
  flex-wrap:wrap;
  gap:8px
}

.badges li {
  display:flex;
  align-items:center;
  justify-content:center;
  width:34px;
  height:34px;
  border:2px solid #312e2c;
  border-radius:50%
}

.badges li.got {
  background:#ffbe77
}

.badges li.open {
  border-color:#b9b4a6;
  color:#b9b4a6;
  background:#fffdf6
}

.goals .sr {
  position:absolute;
  width:1px;
  height:1px;
  overflow:hidden;
  clip:rect(0 0 0 0);
  white-space:nowrap
}

.stage.fx-gold-bowl .bowl {
  filter:sepia(1) saturate(3) hue-rotate(-8deg) brightness(1.1)
}

.stage.fx-stars::before {
  content:"";
  position:absolute;
  inset:0;
  pointer-events:none;
  background-image:radial-gradient(circle at 12% 22%,#fff7c2 0 1.5px,transparent 2px),radial-gradient(circle at 78% 16%,#fff7c2 0 2px,transparent 2.5px),radial-gradient(circle at 88% 58%,#fff7c2 0 1.5px,transparent 2px),radial-gradient(circle at 30% 70%,#fff7c2 0 1.5px,transparent 2px),radial-gradient(circle at 60% 34%,#fff7c2 0 1px,transparent 1.5px);
  animation:fx-twinkle 3.2s ease-in-out infinite alternate
}

@keyframes fx-twinkle {
  from { opacity:.45 }
  to { opacity:1 }
}

.stage.fx-sunrise::after {
  content:"";
  position:absolute;
  inset:0;
  pointer-events:none;
  background:linear-gradient(to top,#ffb36b55,#ffe9a800 60%)
}

.stage.fx-glow .cat {
  filter:drop-shadow(0 3px 0 #79513d35) drop-shadow(0 0 14px #ffd36bcc)
}

@media(prefers-reduced-motion:reduce) {
  .stage.fx-stars::before {
    animation:none
  }
}
```

Die Werte sind ein Ausgangspunkt: Wo die Bühne schon Pseudo-Elemente, `z-index` oder `overflow` nutzt, anpassen, sodass nichts verdeckt wird (Katze, Sprechblase, Lautsprecher-Knopf, Beschriftung). Die Abweichungen im Bericht nennen. In `app/globals.css` als **letzte** Zeile ergänzen: `@import "../styles/goals.css";`

- [ ] **Step 6: Prüfungen**

Run: `npm test` (alle PASS; die UI hat keine Tests), `npx tsc --noEmit -p .` (0 Zeilen), `npm run lint` (0 Fehler, keine neue Warnung außer den bekannten), `npm run build` (erfolgreich). Ohne Browser ist die Optik nur per Code geprüft; das im Bericht ausdrücklich sagen und beschreiben, was visuell zu prüfen ist (Karte, Balken, Abzeichenreihe, Titel im Schildchen, alle vier Optiken, schmale Breite 390 px).

- [ ] **Step 7: Commit**

```bash
git add components/cat/GoalsCard.tsx components/cat/ActivityCard.tsx components/cat/CatStage.tsx app/page.tsx styles/goals.css app/globals.css lib/goals.ts
git commit -m "Karte Kursziele, Titel und Optik im Katzenzimmer"
```

(`lib/goals.ts` nur dann stagen, wenn ein Icon-Name geändert wurde.)

---

### Task 5: README, lokale Datenbank und Abschluss

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README ergänzen**

Im Abschnitt „Datenbank einrichten“ nach dem Absatz zur Migration `0006` kurz (deutsch) ergänzen: Mit den Kurszielen kommen zwei weitere Migrationen (`drizzle/0007_<name>.sql` und `drizzle/0008_backfill_actions_counter.sql`, echten Namen aus `ls drizzle` einsetzen), die auf eine **bestehende** lokale Datenbank wie die vorherigen einzeln und **der Reihe nach** eingespielt werden (`0008` füllt den neuen Zähler `cat.actions` aus dem Protokoll). Ohne sie antwortet `GET /api/cat` mit 500 (`no such table: goals_reached` bzw. `no such column`). Beim späteren Einrichten eines Hostings müssen die Migrationen `0000` bis `0008` der Reihe nach laufen.

- [ ] **Step 2: Lokale Entwicklungsdatenbank migrieren**

Der laufende Dev-Server nutzt `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<64hex>.sqlite` (nicht `metadata.sqlite`; mit `ls` den Namen finden). Das ist die echte lokale Datenbank des Nutzers. `0007` ist rein additiv; `0008` schreibt einen aus dem Protokoll abgeleiteten Zähler in die Zeile `cat`. Vorgehen:

1. Backup: `sqlite3 <db> ".backup '/private/tmp/claude-501/-Users-jonas-Documents-Claude-Kurskatze-wwi25a2-kurskatze/7a4d57cf-a6ec-475f-a9c7-82677e75832e/scratchpad/db-before-goals.sqlite'"`
2. Vorher notieren: `.tables`, Zeilenzahlen von players/accounts/cooldowns/events/actions/cat, und die komplette Zeile `cat` (`SELECT * FROM cat`).
3. Nur die neuen Dateien der Reihe nach einspielen: `sed 's/--> statement-breakpoint//' drizzle/0007_<name>.sql | sqlite3 <db>`, dann dasselbe mit `drizzle/0008_backfill_actions_counter.sql`.
4. Nachher: `.tables` zeigt `goals_reached`; Zeilenzahlen unverändert; `SELECT * FROM cat` unterscheidet sich nur durch die neue Spalte `actions` (Wert = Anzahl der Zeilen in `actions`); `SELECT count(*) FROM actions` zum Abgleich.
5. `curl -s http://127.0.0.1:5173/api/cat | head -c 800` liefert JSON mit `"goals":`; dabei kann ein bereits erreichtes Ziel (z. B. bei vorhandenen Punkten) beim ersten Abruf eingetragen werden. Das ist erwartet (idempotent). Notieren, was in `goals_reached` und `events` steht.

Nur GET, keine Konten oder sonstigen Daten anlegen.

- [ ] **Step 3: Prüfungen**

Run: `npm test` (alle PASS), `npx tsc --noEmit -p .` (0 Zeilen), `npm run lint` (0 Fehler, keine neue Warnung außer den bekannten), `npm run build` (erfolgreich).

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "README: Migrationen 0007 und 0008 für die Kursziele"
```
