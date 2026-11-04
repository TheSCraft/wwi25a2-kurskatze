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
// Jeder Schleifendurchlauf beginnt wie ein neuer Test (wie tests/setup.ts): sonst ist "Lisa" schon vergeben und die gemeinsame Pause läuft.
async function reset() {
  const db = env.DB!;
  await db.batch(
    ["cooldowns", "sessions", "accounts", "players", "cat", "login_attempts", "events", "actions", "goals_reached"].map((t) =>
      db.prepare(`DELETE FROM ${t}`),
    ),
  );
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
    await reset();
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
  expect((await json(await get(session))).me.points).toBe(0);
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
    await reset();
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

test("Tote Katze, Zuneigung lange bei 0 %: Miauen meldet den Tod, nicht das Schmollen", async () => {
  const session = await ready();
  await env.DB!.prepare("UPDATE cat SET love=?,food_expires=?").bind(NOW - 10 * 3_600_000, NOW - 1000).run();
  const res = await act(session, "meow");
  expect(res.status).toBe(409);
  expect((await json(res)).error).toBe("Byte ist gestorben. Beteilige dich an der gemeinsamen Futterrunde.");
});

test("Ende der Schutzfrist: eine Millisekunde davor ist Byte einsam, Miauen geht", async () => {
  const session = await ready();
  await env.DB!.prepare("UPDATE cat SET love=?").bind(NOW - sulkGrace + 1).run();
  expect((await act(session, "meow")).status).toBe(200);
});

test("Ende der Schutzfrist: genau am Ende schmollt Byte, Miauen wird abgelehnt", async () => {
  const session = await ready();
  await env.DB!.prepare("UPDATE cat SET love=?").bind(NOW - sulkGrace).run();
  const res = await act(session, "meow");
  expect(res.status).toBe(409);
  expect((await json(res)).error).toBe("Byte schmollt und antwortet nicht.");
});
