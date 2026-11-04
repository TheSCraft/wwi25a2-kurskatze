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
