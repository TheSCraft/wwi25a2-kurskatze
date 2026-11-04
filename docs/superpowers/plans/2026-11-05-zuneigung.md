# Zuneigung mit Folgen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Zuneigung bekommt vier Stufen (glücklich, normal, einsam, schmollend) mit einem Punkte-Bonus bei hoher Zuneigung und Strafen nach einer Schutzfrist von 2 Stunden bei 0 % (halbes Futter, halbe Punkte, kein Miauen, schnellerer Hunger).

**Architecture:** Reine Funktionen und alle Zahlen in `lib/mood.ts`. Die Aktion liest die Zuneigung vor dem Batch, berechnet Punkte und Futterwirkung und übergibt sie an die bestehenden Anweisungen (plus eine `love=?`-Bedingung im Cooldown als Guard). Der beschleunigte Hunger wird nachträglich abgerechnet (`lib/server/settle.ts`, Spalte `cat.settled`), als erste Anweisung im Batch von `state()` und von `interact`; Todeszeit, Cooldown-Prüfung und Wiederbelebung lesen weiter denselben Wert `food_expires`. Der Client berechnet die Stufe live aus `loveExpires`.

**Tech Stack:** Next 16 / vinext, React 19, Cloudflare D1 + Drizzle (nur Schema/Migration), Vitest mit `@cloudflare/vitest-plugin`.

**Spec:** `docs/superpowers/specs/2026-11-05-zuneigung-design.md`

## Global Constraints

- Node `>=22.13.0` ist nötig. Auf dem Entwicklerrechner läuft Node 20, deshalb jedes Kommando mit `export PATH=/private/tmp/claude-501/-Users-jonas-Documents-Claude-Kurskatze-wwi25a2-kurskatze/7a4d57cf-a6ec-475f-a9c7-82677e75832e/scratchpad/node22/node_modules/node/bin:$PATH` vorstellen.
- Keine neuen Pakete. `package.json` und `pnpm-lock.yaml` bleiben unverändert. `lib/cat-rules.ts` bleibt unverändert (alle neuen Zahlen in `lib/mood.ts`).
- Konstanten genau: `loveUnit = 360000`, `happyFrom = 70`, `normalFrom = 30`, `happyBonus = 1.25`, `sulkGrace = 2 * 60 * 60 * 1000`, `hungerExtra = 0.5`, `settleStep = 60000`.
- Stufen: `lovePercent = max(0, ceil((love - now) / loveUnit))`; `happy` ab 70, `normal` ab 30, `lonely` ab 1, bei 0 `sulking` erst ab `now >= love + sulkGrace`, sonst `lonely`.
- Punkte: `happy` gibt `Math.round(points * 1.25)`; `sulking` gibt für `food` und `meow` `Math.max(1, Math.ceil(points / 2))`; Pflege-Aktionen (`love`, `play`, `brush`, `study`) werden nie bestraft. `foodFactor` ist 0,5 beim Schmollen, sonst 1.
- Miauen beim Schmollen: HTTP 409, Fehlertext genau „Byte schmollt und antwortet nicht.“, kein Cooldown, kein Protokoll, keine Punkte.
- Migration `0009` mit `npx drizzle-kit generate` (nur `ALTER TABLE cat ADD settled integer`), nicht von Hand schreiben.
- CSS in neuer Datei `styles/mood.css`, in `app/globals.css` als **letzte** Zeile importiert.
- Commits nur auf dem Branch `zuneigung` (aufgebaut auf `kursziele`), nie pushen. Commit-Trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Nicht anfassen: `scripts/`, `vendor/`, `worker/`, `examples/`, `components/ui/`, bestehende Migrationen `drizzle/0000`–`0008`, `components/stickerbox.tsx`, `lib/sticker-*.ts`, `lib/meow-sound.ts`, `lib/cat-rules.ts`.
- Lint 0 Fehler (drei `no-img-element`-Warnungen sind bekannt), `npx tsc --noEmit -p .` 0 Zeilen.
- Die lokale Entwicklungsdatenbank des Nutzers (`.wrangler/...`) wird nur in Task 5 und nur mit Backup migriert. Bis dahin antwortet der Dev-Server auf `/api/cat` mit 500 (`no such column`), das ist erwartet.
- Arbeitet ein Task in einem separaten Git-Worktree: Worktrees entstehen aus dem `main`-Stand, **nicht** aus dem Feature-Branch. Der Task cherry-pickt zuerst die genannten Commits des Feature-Branchs, legt `node_modules` per Symlink an und committet nur dort; der Controller übernimmt den Commit per `cherry-pick`.

## File Structure

```
lib/mood.ts                          Konstanten, lovePercent, moodLevel, effectivePoints, foodFactor
lib/cat-types.ts                     Data.loveExpires
tests/mood.test.ts                   reine Funktionen, loveUnit === unit
db/schema.ts                         cat.settled
drizzle/0009_*.sql (+ meta)          generiert
tests/setup.ts                       Migrationscheck auf cat.settled
lib/server/settle.ts                 settleSql, settleStatement
lib/server/state.ts                  Abrechnung zuerst, loveExpires
tests/settle.test.ts                 Abrechnung, Tod durch Abrechnung, API
lib/server/actions/interact.ts       Mood-Wirkung, Guard, Abrechnung zuerst, cooldownSql
tests/mood-actions.test.ts           Bonus, Schmollen, Guard, Abrechnung in der Aktion
components/cat/StatusCard.tsx        Stimmungszeile
components/cat/ActionPanel.tsx       Punkte, Sättigung, Miau-Knopf
components/cat/CatStage.tsx          mood-Klasse, Standardtext der Sprechblase
app/page.tsx                         mood berechnen und durchreichen
styles/mood.css                      Look je Stufe
app/globals.css                      + @import
README.md                            Migration 0009
```

---

### Task 1: Reine Funktionen und Typ

**Files:**
- Create: `lib/mood.ts`, `tests/mood.test.ts`
- Modify: `lib/cat-types.ts`

**Interfaces:**
- Produces: die Konstanten (siehe Global Constraints), `type Mood = "happy"|"normal"|"lonely"|"sulking"`, `lovePercent(loveExpires:number, now:number):number`, `moodLevel(loveExpires:number, now:number):Mood`, `effectivePoints(action:string, points:number, level:Mood):number`, `foodFactor(level:Mood):number`; `Data.loveExpires: number` in `lib/cat-types.ts`.

- [ ] **Step 1: Failing tests schreiben (`tests/mood.test.ts`)**

```ts
import { expect, test } from "vitest";
import { effectivePoints, foodFactor, loveUnit, lovePercent, moodLevel, sulkGrace } from "../lib/mood";
import { unit } from "../lib/server/db";

const NOW = 1_800_000_000_000;
const at = (percent: number) => NOW + percent * loveUnit; // loveExpires für genau `percent` Prozent

test("loveUnit entspricht der Einheit in lib/server/db.ts", () => {
  expect(loveUnit).toBe(unit);
});

test("lovePercent rundet auf und ist nie negativ", () => {
  expect(lovePercent(at(70), NOW)).toBe(70);
  expect(lovePercent(NOW + 1, NOW)).toBe(1);
  expect(lovePercent(NOW, NOW)).toBe(0);
  expect(lovePercent(NOW - 5 * loveUnit, NOW)).toBe(0);
});

test("moodLevel: Grenzen 70/69, 30/29, 1/0", () => {
  expect(moodLevel(at(100), NOW)).toBe("happy");
  expect(moodLevel(at(70), NOW)).toBe("happy");
  expect(moodLevel(at(69), NOW)).toBe("normal");
  expect(moodLevel(at(30), NOW)).toBe("normal");
  expect(moodLevel(at(29), NOW)).toBe("lonely");
  expect(moodLevel(NOW + 1, NOW)).toBe("lonely"); // 1 %
});

test("moodLevel: bei 0 % erst nach der Schutzfrist schmollend", () => {
  const love = NOW;
  expect(moodLevel(love, NOW)).toBe("lonely");
  expect(moodLevel(love, NOW + sulkGrace - 1)).toBe("lonely");
  expect(moodLevel(love, NOW + sulkGrace)).toBe("sulking");
  expect(moodLevel(love, NOW + sulkGrace + 1)).toBe("sulking");
});

test("effectivePoints: Bonus bei happy, Halbierung beim Schmollen nur für food und meow", () => {
  expect(effectivePoints("food", 5, "happy")).toBe(6);
  expect(effectivePoints("love", 5, "happy")).toBe(6);
  expect(effectivePoints("meow", 1, "happy")).toBe(1);
  expect(effectivePoints("play", 6, "happy")).toBe(8);
  expect(effectivePoints("brush", 4, "happy")).toBe(5);
  expect(effectivePoints("study", 8, "happy")).toBe(10);
  expect(effectivePoints("food", 5, "sulking")).toBe(3);
  expect(effectivePoints("meow", 1, "sulking")).toBe(1);
  for (const [action, points] of [["love", 5], ["play", 6], ["brush", 4], ["study", 8]] as const) {
    expect(effectivePoints(action, points, "sulking")).toBe(points);
  }
  for (const level of ["normal", "lonely"] as const) {
    expect(effectivePoints("food", 5, level)).toBe(5);
    expect(effectivePoints("study", 8, level)).toBe(8);
  }
});

test("foodFactor: halb beim Schmollen", () => {
  expect(foodFactor("sulking")).toBe(0.5);
  expect(foodFactor("happy")).toBe(1);
  expect(foodFactor("normal")).toBe(1);
  expect(foodFactor("lonely")).toBe(1);
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run tests/mood.test.ts`
Expected: FAIL (`lib/mood` existiert nicht).

- [ ] **Step 3: `lib/mood.ts` anlegen**

```ts
// Stimmung von Byte nach Zuneigung. Alle Zahlen an einer Stelle, bewusst nicht in lib/cat-rules.ts.
export const loveUnit = 360000; // gleich `unit` in lib/server/db.ts (ein Test prüft die Gleichheit)
export const happyFrom = 70; // ab dieser Zuneigung (in %) gilt der Punkte-Bonus
export const normalFrom = 30; // darunter ist Byte einsam
export const happyBonus = 1.25;
export const sulkGrace = 2 * 60 * 60 * 1000; // Schutzfrist: so lange bei 0 %, bevor Byte schmollt
export const hungerExtra = 0.5; // zusätzlicher Hunger (1,5-fach insgesamt) beim Schmollen
export const settleStep = 60000; // Abrechnung des Hungers höchstens einmal pro Minute

export type Mood = "happy" | "normal" | "lonely" | "sulking";

export function lovePercent(loveExpires: number, now: number): number {
  return Math.max(0, Math.ceil((loveExpires - now) / loveUnit));
}

export function moodLevel(loveExpires: number, now: number): Mood {
  const percent = lovePercent(loveExpires, now);
  if (percent >= happyFrom) return "happy";
  if (percent >= normalFrom) return "normal";
  if (percent >= 1) return "lonely";
  return now >= loveExpires + sulkGrace ? "sulking" : "lonely";
}

export function effectivePoints(action: string, points: number, level: Mood): number {
  if (level === "happy") return Math.round(points * happyBonus);
  if (level === "sulking" && (action === "food" || action === "meow")) return Math.max(1, Math.ceil(points / 2));
  return points;
}

export function foodFactor(level: Mood): number {
  return level === "sulking" ? 0.5 : 1;
}
```

- [ ] **Step 4: Typ ergänzen (`lib/cat-types.ts`)**

In `Data` am Anfang `loveExpires:number;` ergänzen (also `export type Data={loveExpires:number;goals:...`, alles andere wortgleich).

- [ ] **Step 5: Tests und Prüfungen**

Run: `npx vitest run tests/mood.test.ts` (PASS), `npm test` (alle PASS), `npx tsc --noEmit -p .` (0 Zeilen), `npm run lint` (0 Fehler).

- [ ] **Step 6: Commit**

```bash
git add lib/mood.ts lib/cat-types.ts tests/mood.test.ts
git commit -m "Stufen der Zuneigung und ihre Wirkung als reine Funktionen"
```

---

### Task 2: Schema, Abrechnung des Hungers und `loveExpires` in der API

**Files:**
- Modify: `db/schema.ts`, `tests/setup.ts`, `lib/server/state.ts`
- Create: `drizzle/0009_*.sql` (generiert), `lib/server/settle.ts`, `tests/settle.test.ts`

**Interfaces:**
- Consumes: `hungerExtra`, `settleStep`, `sulkGrace` (Task 1).
- Produces: Spalte `cat.settled`; `settleStatement(now:number)` (ein Statement, das als **erste** Anweisung eines Batches steht); `state()` liefert `loveExpires` und rechnet vor allem anderen ab.

- [ ] **Step 1: Failing tests schreiben (`tests/settle.test.ts`)**

```ts
import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { hungerExtra, sulkGrace } from "../lib/mood";
import { T0, get, json, register, setTime } from "./helpers";

type Cat = { food_expires: number; love: number; active: number; settled: number | null };
async function cat(): Promise<Cat> {
  return (await env.DB!.prepare("SELECT food_expires,love,active,settled FROM cat WHERE id=1").first()) as Cat;
}
async function setCat(sets: string, ...values: number[]) {
  await env.DB!.prepare(`UPDATE cat SET ${sets}`).bind(...values).run();
}

// Byte ist seit T0 bei 0 % Zuneigung, letzte Aktion T0.
async function lonelyCat() {
  setTime(T0);
  const { session } = await register("Lisa");
  await get(session);
  await setCat("love=?,active=?", T0, T0);
  return session;
}

test("loveExpires steht im State, auch abgemeldet", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  await get(session);
  const anonymous = await json(await get());
  expect(anonymous.account).toBe(false);
  expect(anonymous.loveExpires).toBe((await cat()).love);
});

test("keine Abrechnung innerhalb der Schutzfrist", async () => {
  const session = await lonelyCat();
  const before = (await cat()).food_expires;
  setTime(T0 + sulkGrace - 1000);
  await get(session);
  expect(await cat()).toMatchObject({ food_expires: before, settled: null });
});

test("nach der Schutzfrist: der zusätzliche Hunger (0,5-fach) wird abgezogen", async () => {
  const session = await lonelyCat();
  const before = (await cat()).food_expires;
  const now = T0 + sulkGrace + 10 * 60 * 1000; // 10 Minuten nach Ende der Schutzfrist
  setTime(now);
  await get(session);
  const after = await cat();
  expect(after.food_expires).toBe(before - hungerExtra * 10 * 60 * 1000);
  expect(after.settled).toBe(now);
});

test("höchstens einmal pro 60 Sekunden", async () => {
  const session = await lonelyCat();
  const now = T0 + sulkGrace + 10 * 60 * 1000;
  setTime(now);
  await get(session);
  const settledOnce = await cat();
  setTime(now + 30_000);
  await get(session);
  expect(await cat()).toEqual(settledOnce);
  setTime(now + 61_000);
  await get(session);
  const again = await cat();
  expect(again.food_expires).toBe(settledOnce.food_expires - hungerExtra * 61_000);
  expect(again.settled).toBe(now + 61_000);
});

test("nach einer Aktion (active = jetzt) wird nichts mehr abgerechnet", async () => {
  const session = await lonelyCat();
  const now = T0 + sulkGrace + 10 * 60 * 1000;
  setTime(now);
  await setCat("active=?", now); // wie nach einer angenommenen Aktion
  const before = (await cat()).food_expires;
  await get(session);
  expect(await cat()).toMatchObject({ food_expires: before, settled: null });
});

test("bei totem Byte wird nicht abgerechnet", async () => {
  const session = await lonelyCat();
  const now = T0 + sulkGrace + 10 * 60 * 1000;
  setTime(now);
  await setCat("food_expires=?", now - 1000);
  await get(session);
  expect(await cat()).toMatchObject({ food_expires: now - 1000, settled: null });
});

test("Tod durch die Abrechnung: died mit der echten Todeszeit, Sättigung 0", async () => {
  const session = await lonelyCat();
  const now = T0 + sulkGrace + 60 * 60 * 1000; // 1 Stunde nach Ende der Schutzfrist: 30 Minuten Abzug
  setTime(now);
  await setCat("food_expires=?", now + 100_000);
  const body = await json(await get(session));
  const died = (await cat()).food_expires; // = now + 100000 - 1800000
  expect(died).toBe(now + 100_000 - hungerExtra * 60 * 60 * 1000);
  expect(body.food).toBe(0);
  const diedEvents = body.events.filter((e: { type: string }) => e.type === "died");
  expect(diedEvents).toHaveLength(1);
  expect(diedEvents[0].at).toBe(died);
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run tests/settle.test.ts`
Expected: FAIL (`no such column: settled`).

- [ ] **Step 3: Schema ändern (`db/schema.ts`)**

In der Zeile `export const cat=...`: `actions:integer("actions").notNull().default(0),active:` wird zu `actions:integer("actions").notNull().default(0),settled:integer("settled"),active:`.

- [ ] **Step 4: Migration erzeugen**

Run: `npx drizzle-kit generate`
Expected: `drizzle/0009_<name>.sql` mit genau `ALTER TABLE \`cat\` ADD \`settled\` integer;` (plus Meta, Journal idx 9). Fragt `drizzle-kit` interaktiv etwas, abbrechen und melden.

- [ ] **Step 5: `tests/setup.ts` anpassen**

Die letzte Migration fügt nur eine Spalte hinzu. Der Check, ob die Migrationen schon laufen, prüft deshalb die Spalte:

```ts
// alt:
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='goals_reached'")
// neu:
    .prepare("SELECT name FROM pragma_table_info('cat') WHERE name='settled'")
```

- [ ] **Step 6: `lib/server/settle.ts` anlegen**

```ts
import {sql} from "./db";
import {hungerExtra,settleStep,sulkGrace} from "../mood";

// Rechnet den zusätzlichen Hunger ab, solange Byte länger als die Schutzfrist ganz ohne Zuneigung ist:
// Zeit seit max(Zuneigung-0 + Schutzfrist, letzte Aktion, letzte Abrechnung), davon der Anteil `hungerExtra`.
// Läuft nur bei lebendem Byte und frühestens nach `settleStep` (höchstens ~1.440 Schreibzugriffe pro Tag).
// Muss als erste Anweisung eines Batches stehen, damit Tod und Cooldown-Prüfung den neuen Wert sehen.
export const settleSql="UPDATE cat SET food_expires=food_expires-CAST(? * (?-max(love+?,COALESCE(active,0),COALESCE(settled,0))) AS INTEGER),settled=? WHERE id=1 AND food_expires>? AND ?-max(love+?,COALESCE(active,0),COALESCE(settled,0))>=?";
export const settleStatement=(now:number)=>sql(settleSql,hungerExtra,now,sulkGrace,now,now,now,sulkGrace,settleStep);
```

- [ ] **Step 7: `state()` anpassen (`lib/server/state.ts`)**

Drei exakte Ersetzungen, nichts sonst:

1. Import nach `import {newlyReached,type Counters} from "../goals";` ergänzen: `import {settleStatement} from "./settle";`
2. Anfang des Batches: `const [,c,r,p,t,rev,team,ev,wk,pt,rv,gr]=await db().batch([sql("INSERT OR IGNORE INTO events(key,type,player,at) SELECT 'died:'` wird zu `const [,,c,r,p,t,rev,team,ev,wk,pt,rv,gr]=await db().batch([settleStatement(now),sql("INSERT OR IGNORE INTO events(key,type,player,at) SELECT 'died:'`
3. Im `return {`: `return {goals:` wird zu `return {loveExpires:cat.love,goals:`

- [ ] **Step 8: Tests laufen lassen**

Run: `npm test`
Expected: alle PASS (bisherige und `tests/settle.test.ts`). Bricht ein bestehender Test, weil er `state()` exakt vergleicht, nur das neue Feld ergänzen und im Bericht nennen.

- [ ] **Step 9: Prüfungen und Commit**

Run: `npx tsc --noEmit -p .` (0 Zeilen), `npm run lint` (0 Fehler).

```bash
git add db/schema.ts drizzle tests/setup.ts lib/server/settle.ts lib/server/state.ts tests/settle.test.ts
git commit -m "Abrechnung des Hungers bei Einsamkeit und loveExpires in der API"
```

---

### Task 3: Wirkung in der Aktion (Bonus, Schmollen, Guard)

**Files:**
- Modify: `lib/server/actions/interact.ts`
- Create: `tests/mood-actions.test.ts`

**Interfaces:**
- Consumes: `moodLevel`, `effectivePoints`, `foodFactor` (Task 1), `settleStatement` (Task 2).
- Produces: `export const cooldownSql` in `interact.ts`; die Aktion wendet Bonus/Strafen an, lehnt Miauen beim Schmollen ab und rechnet den Hunger vor der Aktion ab.

- [ ] **Step 1: Failing tests schreiben (`tests/mood-actions.test.ts`)**

```ts
import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { rules } from "../lib/cat-rules";
import { loveUnit, sulkGrace } from "../lib/mood";
import { cooldownSql } from "../lib/server/actions/interact";
import { T0, act, get, json, register, setTime } from "./helpers";

const SECOND = 1000;
const NOW = T0 + 6 * SECOND; // gemeinsame Pause (5 s) ist vorbei

async function ready() {
  setTime(T0);
  const { session } = await register("Lisa");
  await get(session);
  setTime(NOW);
  return session;
}
async function setLove(percent: number) {
  await env.DB!.prepare("UPDATE cat SET love=?").bind(NOW + percent * loveUnit).run();
}
async function setSulking() {
  await env.DB!.prepare("UPDATE cat SET love=?").bind(NOW - sulkGrace - 1000).run(); // 0 %, Schutzfrist vorbei
}
async function foodExpires(): Promise<number> {
  return ((await env.DB!.prepare("SELECT food_expires AS f FROM cat").first()) as { f: number }).f;
}
async function protocol() {
  return (await env.DB!.prepare("SELECT action,points FROM actions ORDER BY id").all()).results;
}

test("happy (80 %): 25 % mehr Punkte, identisch in Gesamtpunkten, Protokoll und Wochenwertung", async () => {
  const session = await ready();
  await setLove(80);
  const body = await json(await act(session, "food"));
  expect(body.me.points).toBe(6);
  expect(await protocol()).toEqual([{ action: "food", points: 6 }]);
  expect(body.weekBoard).toEqual([{ name: "Lisa", points: 6 }]);
});

test("normal (50 %) und einsam (20 %): normale Punkte und volle Futterwirkung", async () => {
  for (const percent of [50, 20]) {
    const session = await ready();
    await setLove(percent);
    const before = await foodExpires();
    const body = await json(await act(session, "food"));
    expect(body.me.points).toBe(rules.food.points);
    expect((await foodExpires()) - before).toBe(32_400_000); // foodLifetime / 8
    await env.DB!.exec("DELETE FROM actions");
    await env.DB!.exec("DELETE FROM cooldowns");
    await env.DB!.exec("UPDATE players SET points=0");
  }
});

test("Schmollen: Futter wirkt nur halb und gibt halbe Punkte", async () => {
  const session = await ready();
  await setSulking();
  const before = await foodExpires();
  const body = await json(await act(session, "food"));
  expect(body.me.points).toBe(3);
  expect((await foodExpires()) - before).toBe(16_200_000); // halbe Wirkung
  expect(await protocol()).toEqual([{ action: "food", points: 3 }]);
});

test("Schmollen: Miauen wird abgelehnt und hinterlässt nichts", async () => {
  const session = await ready();
  await setSulking();
  const res = await act(session, "meow");
  expect(res.status).toBe(409);
  expect((await json(res)).error).toBe("Byte schmollt und antwortet nicht.");
  expect(await protocol()).toEqual([]);
  const cooldowns = await env.DB!.prepare("SELECT count(*) AS n FROM cooldowns").first<{ n: number }>();
  expect(cooldowns!.n).toBe(0);
  const row = await env.DB!.prepare("SELECT calls,actions FROM cat").first();
  expect(row).toEqual({ calls: 0, actions: 0 });
});

test("Schmollen: Pflege-Aktionen werden nie bestraft", async () => {
  for (const action of ["love", "play", "brush", "study"] as const) {
    const session = await ready();
    await setSulking();
    const res = await act(session, action);
    expect(res.status).toBe(200);
    expect((await json(res)).me.points).toBe(rules[action].points);
    await env.DB!.exec("DELETE FROM actions");
    await env.DB!.exec("DELETE FROM cooldowns");
    await env.DB!.exec("UPDATE players SET points=0");
  }
});

test("Guard: eine geänderte Zuneigung zwischen Lesen und Schreiben lässt die Aktion nichts schreiben", async () => {
  const session = await ready();
  await get(session);
  const love = (await env.DB!.prepare("SELECT love FROM cat").first<{ love: number }>())!.love;
  const insert = (guard: number) =>
    env.DB!
      .prepare(cooldownSql)
      .bind("slot", "player", "food", NOW + 1000, NOW, NOW - 5000, guard, NOW)
      .run();
  expect((await insert(love + 1)).meta.changes).toBe(0); // veralteter Wert: nichts eingefügt
  expect((await insert(love)).meta.changes).toBe(1); // aktueller Wert: eingefügt
});

test("Die Abrechnung läuft vor der Aktion (zusätzlicher Hunger der Schmollzeit)", async () => {
  const session = await ready();
  // seit 5 Stunden bei 0 %, letzte Aktion lange her: Schutzfrist (2 h) endete vor 3 Stunden
  await env.DB!.prepare("UPDATE cat SET love=?,active=?").bind(T0 - 5 * 3_600_000, T0 - 10 * 3_600_000).run();
  const before = await foodExpires();
  const res = await act(session, "food");
  expect(res.status).toBe(200);
  const lonelyMs = NOW - (T0 - 5 * 3_600_000 + sulkGrace); // Zeit nach der Schutzfrist
  expect((await foodExpires()) - before).toBe(-0.5 * lonelyMs + 16_200_000); // Abzug, dann halbes Futter
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run tests/mood-actions.test.ts`
Expected: FAIL (`cooldownSql` wird nicht exportiert, Punkte unverändert).

- [ ] **Step 3: `lib/server/actions/interact.ts` ändern**

Exakte Ersetzungen (alles andere bleibt byte-identisch, insbesondere der Rest der langen `UPDATE cat`-Anweisung):

1. Imports ergänzen:

```ts
import {moodLevel,effectivePoints,foodFactor} from "../../mood";
import {settleStatement} from "../settle";
```

2. Vor `export async function handleInteract` die Cooldown-Anweisung als exportierte Konstante einfügen (der Text ist die bisherige Anweisung mit der zusätzlichen Bedingung `AND love=?`):

```ts
// Die Bedingung `love=?` ist der Guard: hat sich die Zuneigung seit dem Lesen geändert, wird nichts geschrieben.
export const cooldownSql="INSERT INTO cooldowns(id,player,action,until) SELECT ?,?,?,? FROM cat WHERE id=1 AND food_expires>? AND active<=? AND love=? ON CONFLICT(id) DO UPDATE SET until=excluded.until WHERE cooldowns.until<=?";
```

3. Nach der Zeile `const rule=rules[action as keyof typeof rules],slot=who.player+"/"+action;` einfügen:

```ts
 // Zuneigung vor dem Batch lesen: Stufe, Punkte und Futterwirkung werden vor dem Batch bestimmt (Guard `love=?` im Cooldown).
 const cat=await db().prepare("SELECT love FROM cat WHERE id=1").first<{love:number}>();
 const love=cat?cat.love:0,level=moodLevel(love,now);
 if(level==="sulking"&&action==="meow"){const data=await state(who);return response({...data,error:"Byte schmollt und antwortet nicht."},409)}
 const points=effectivePoints(action,rule.points,level),foodGain=rule.food*foodLifetime/100*foodFactor(level);
```

4. Im Batch:
   - `const [accepted]=await db().batch([` wird zu `const [,accepted]=await db().batch([settleStatement(now),`
   - Die Cooldown-Anweisung `sql("INSERT INTO cooldowns(id,player,action,until) SELECT ?,?,?,? FROM cat WHERE id=1 AND active<=? ... ",slot,...,now-sharedPause,now)` (der vollständige bisherige `sql(...)`-Aufruf) wird zu `sql(cooldownSql,slot,who.player,action,now+rule.seconds*1000,now,now-sharedPause,love,now)`.
   - `sql("UPDATE players SET points=points+?,last=? WHERE id=? AND changes()>0",rule.points,now,who.player)` wird zu `...,points,now,who.player)`.
   - Im `UPDATE cat`: die gebundenen Werte `rule.food*foodLifetime/100,minimumTeamSize` werden zu `foodGain,minimumTeamSize` (alles andere in dieser Anweisung unverändert).
   - Am Ende `who.player,action,rule.points,now)]);` wird zu `who.player,action,points,now)]);`

- [ ] **Step 4: Tests laufen lassen**

Run: `npm test`
Expected: alle PASS. Bricht ein bestehender Test (etwa wegen der Punkte bei hoher Zuneigung: die Startzuneigung ist 84 %, also `happy` mit +25 %!), prüfen, ob der Test von der Startzuneigung abhängt, und ihn minimal anpassen (die erwarteten Punkte der ersten Aktion bei Startzuneigung 84 % sind `effectivePoints(action, rule.points, "happy")`, also Füttern 6, Miauen 1, Spielen 8, Bürsten 5, Lernen 10; die Punkte kommen am besten aus `effectivePoints`). Jede solche Anpassung im Bericht nennen und begründen; keine Zusicherung abschwächen.

- [ ] **Step 5: Prüfungen und Commit**

Run: `npx tsc --noEmit -p .` (0 Zeilen), `npm run lint` (0 Fehler).

```bash
git add lib/server/actions/interact.ts tests/mood-actions.test.ts tests
git commit -m "Zuneigung wirkt auf Punkte, Futter und Miauen, Hunger wird vor der Aktion abgerechnet"
```

---

### Task 4: Oberfläche (Stimmung, Punkte, Sprechblase, Look)

**Files:**
- Create: `styles/mood.css`
- Modify: `components/cat/StatusCard.tsx`, `components/cat/ActionPanel.tsx`, `components/cat/CatStage.tsx`, `app/page.tsx`, `app/globals.css`

**Interfaces:**
- Consumes: `moodLevel`, `effectivePoints`, `foodFactor`, `type Mood` (Task 1), `Data.loveExpires` (Task 1).

- [ ] **Step 1: `app/page.tsx`**

Import ergänzen: `import {moodLevel} from "../lib/mood";`. Nach der Zeile `const reachedIds=...;` einfügen (defensiv, falls `loveExpires` in einer alten Antwort fehlt):

```ts
 const mood=data&&data.loveExpires!=null?moodLevel(data.loveExpires,now):"normal";
```

Danach an den Aufrufstellen `mood={mood}` ergänzen: an `<CatStage .../>`, `<StatusCard .../>` und `<ActionPanel .../>` (die Aufrufe in `app/page.tsx` suchen; nichts sonst ändern).

- [ ] **Step 2: `components/cat/CatStage.tsx`**

`type Props=...` um `mood:string` ergänzen, die Funktionssignatur um `mood`, und

- `className={(dead?"stage memorial":"stage")+effects.map(x=>" fx-"+x).join("")}` wird zu `className={(dead?"stage memorial":"stage")+effects.map(x=>" fx-"+x).join("")+" mood-"+mood}`
- im Sprechblasen-Text `message||"miau!"` wird zu `message||({happy:"schnurr!",normal:"miau!",lonely:"miau …",sulking:"…"} as Record<string,string>)[mood]||"miau!"`

- [ ] **Step 3: `components/cat/ActionPanel.tsx`**

Importe ergänzen: `import {effectivePoints,foodFactor,type Mood} from "../../lib/mood";`. `type Props` um `mood:Mood` ergänzen, die Signatur um `mood`. Änderungen:

- Punkteanzeige: `"+"+rules[a].points+" Pkt."` wird zu `"+"+effectivePoints(a,rules[a].points,mood)+" Pkt."`
- In `benefit`: `const amount=actionGain(rule.food||rule.love,data?.playerCount||0);` wird zu `const amount=actionGain(rule.food||rule.love,data?.playerCount||0)*(rule.food?foodFactor(mood):1);` und der Rückfall `"Miau für den Kurs"` wird zu `(mood==="sulking"&&action==="meow"?"Byte schmollt":"Miau für den Kurs")`
- `disabled={busy||!data||remaining(a)>0}` wird zu `disabled={busy||!data||remaining(a)>0||(a==="meow"&&mood==="sulking")}`

- [ ] **Step 4: `components/cat/StatusCard.tsx`**

Import ergänzen: `import type {Mood} from "../../lib/mood";`. `type Props` um `mood:Mood`, Signatur um `mood`. Die Stimmungszeile `...:dead?"Der Kurs kann Byte zurückholen.":data.food<30?"Byte könnte einen Snack vertragen.":data.love<30?"Byte vermisst seine Kursmenschen.":"Byte fühlt sich pudelwohl."` wird zu `...:dead?"Der Kurs kann Byte zurückholen.":mood==="sulking"?"Byte schmollt. Er frisst nur halb so viel und ignoriert Miauen.":data.food<30?"Byte könnte einen Snack vertragen.":data.love<30?"Byte vermisst seine Kursmenschen.":mood==="happy"?"Byte schnurrt: Aktionen geben 25 % mehr Punkte.":"Byte fühlt sich pudelwohl."`

- [ ] **Step 5: Stil `styles/mood.css` und Import**

Vorher `styles/stage.css` (`.stage`, `.cat`, `.sun`, `.speech`) und `styles/goals.css` (Optiken `fx-*`, besonders `.stage.fx-glow .cat` mit dem Filter) lesen. Dezenter Look je Stufe, ohne Layoutänderung, keine Pseudo-Elemente der Bühne (die nutzen schon `fx-stars`/`fx-sunrise`), verträglich mit den `fx-*`-Optiken (bei Kollision beider Filter beide Wirkungen erhalten, also kombinierte Selektoren wie `.stage.mood-sulking.fx-glow .cat`) und mit dem Gedenk-Look. Ausgangspunkt:

```css
/* Stimmung von Byte nach Zuneigung (mood-<stufe> auf .stage). */
.stage.mood-happy .sun {
  filter:brightness(1.05) saturate(1.15)
}

.stage.mood-lonely .speech {
  opacity:.85
}

.stage.mood-sulking .cat {
  filter:drop-shadow(0 3px 0 #79513d35) saturate(.65) brightness(.95)
}

.stage.mood-sulking.fx-glow .cat {
  filter:drop-shadow(0 3px 0 #79513d35) drop-shadow(0 0 14px #ffd36bcc) saturate(.65) brightness(.95)
}
```

In `app/globals.css` als **letzte** Zeile ergänzen: `@import "../styles/mood.css";`

- [ ] **Step 6: Prüfungen**

Run: `npm test` (alle PASS; die UI hat keine Tests), `npx tsc --noEmit -p .` (0 Zeilen), `npm run lint` (0 Fehler, keine neue Warnung außer den bekannten), `npm run build` (erfolgreich). Ohne Browser nur per Code geprüft: im Bericht ausdrücklich sagen und die Sichtprüfung beschreiben (Stimmungszeile je Stufe, Punkte und Sättigung auf den Knöpfen, gesperrter Miau-Knopf, Sprechblase, Look je Stufe, Zusammenspiel mit den Optiken und dem Gedenk-Look, 390 px).

- [ ] **Step 7: Commit**

```bash
git add components/cat/StatusCard.tsx components/cat/ActionPanel.tsx components/cat/CatStage.tsx app/page.tsx app/globals.css styles/mood.css
git commit -m "Stimmung von Byte in Status, Aktionsknöpfen und Bühne"
```

---

### Task 5: README, lokale Datenbank und Abschluss

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README ergänzen**

Im Abschnitt „Datenbank einrichten“ nach dem Absatz zu `0007`/`0008` kurz (deutsch) ergänzen: Mit „Zuneigung mit Folgen“ kommt eine weitere Migration (`drizzle/0009_<name>.sql`, echten Namen aus `ls drizzle` einsetzen), die auf eine **bestehende** lokale Datenbank wie die vorherigen einzeln und der Reihe nach eingespielt wird (sie fügt die Spalte `cat.settled` hinzu); ohne sie antwortet `GET /api/cat` mit 500 (`no such column`). Beim späteren Einrichten eines Hostings müssen die Migrationen `0000` bis `0009` der Reihe nach laufen.

- [ ] **Step 2: Lokale Entwicklungsdatenbank migrieren**

Der laufende Dev-Server nutzt `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<64hex>.sqlite` (nicht `metadata.sqlite`). Das ist die echte lokale Datenbank des Nutzers. Die Migration ist rein additiv (eine Spalte, Standard NULL):

1. Backup: `sqlite3 <db> ".backup '/private/tmp/claude-501/-Users-jonas-Documents-Claude-Kurskatze-wwi25a2-kurskatze/7a4d57cf-a6ec-475f-a9c7-82677e75832e/scratchpad/db-before-mood.sqlite'"`
2. Vorher: `.tables`, Zeilenzahlen, die komplette Zeile `SELECT * FROM cat`.
3. Nur die neue Datei einspielen: `sed 's/--> statement-breakpoint//' drizzle/0009_<name>.sql | sqlite3 <db>`
4. Nachher: Zeilenzahlen unverändert, `SELECT * FROM cat` unterscheidet sich nur durch die neue Spalte `settled` (NULL).
5. `curl -s http://127.0.0.1:5173/api/cat | head -c 900` liefert JSON mit `"loveExpires":`. Dabei kann der erste Abruf `settled` setzen und `food_expires` verkürzen, wenn Byte gerade länger als die Schutzfrist bei 0 % Zuneigung ist (das ist die neue Spielregel, kein Fehler). Notieren, ob `food_expires`/`settled` sich geändert haben und warum (Zuneigung des echten Byte vorher/nachher).

Nur GET, keine Konten oder sonstigen Daten anlegen.

- [ ] **Step 3: Prüfungen**

Run: `npm test` (alle PASS), `npx tsc --noEmit -p .` (0 Zeilen), `npm run lint` (0 Fehler, keine neue Warnung außer den bekannten), `npm run build` (erfolgreich).

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "README: Migration 0009 für Zuneigung mit Folgen"
```
