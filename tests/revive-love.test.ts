import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { foodLifetime } from "../lib/cat-rules";
import { effectivePoints, loveUnit, lovePercent, moodLevel, reviveLove } from "../lib/mood";
import { T0, act, get, json, post, register, setTime } from "./helpers";

const LIFETIME = 72 * 60 * 60 * 1000;

type Cat = { food_expires: number; love: number };
async function cat(): Promise<Cat> {
  return (await env.DB!.prepare("SELECT food_expires,love FROM cat WHERE id=1").first()) as Cat;
}

async function deadWith(...names: string[]) {
  setTime(T0);
  const sessions: string[] = [];
  for (const name of names) sessions.push((await register(name)).session);
  await get(sessions[0]);
  await env.DB!.prepare("UPDATE cat SET love=?").bind(T0).run(); // Zuneigung längst bei 0
  setTime(T0 + LIFETIME);
  const state = await json(await get(sessions[0]));
  return { sessions, round: state.foodExpires as number };
}

test("nach der Wiederbelebung steht die Zuneigung auf 30 %", async () => {
  const { sessions, round } = await deadWith("Lisa", "Tom");
  const now = T0 + LIFETIME + 60_000;
  setTime(now);
  await post({ action: "revive", round }, sessions[0]);
  const last = await json(await post({ action: "revive", round }, sessions[1]));
  expect(last.food).toBe(100);
  expect((await cat()).love).toBe(now + reviveLove * loveUnit);
  expect(last.loveExpires).toBe(now + reviveLove * loveUnit);
  expect(moodLevel(last.loveExpires, now)).toBe("normal");
  expect(lovePercent(last.loveExpires, now)).toBe(30);
});

test("eine Wiederbelebung senkt eine höhere Zuneigung nicht", async () => {
  const { sessions, round } = await deadWith("Lisa");
  const now = T0 + LIFETIME + 60_000;
  setTime(now);
  const high = now + 90 * loveUnit;
  await env.DB!.prepare("UPDATE cat SET love=?").bind(high).run();
  expect((await post({ action: "revive", round }, sessions[0])).status).toBe(200);
  expect((await cat()).love).toBe(high);
});

test("eine unvollständige Runde ändert die Zuneigung nicht", async () => {
  const { sessions, round } = await deadWith("Lisa", "Tom");
  setTime(T0 + LIFETIME + 60_000);
  await post({ action: "revive", round }, sessions[0]);
  expect((await cat()).love).toBe(T0);
});

test("nach der Wiederbelebung wirkt Futter nicht halbiert", async () => {
  const { sessions, round } = await deadWith("Lisa", "Tom");
  const now = T0 + LIFETIME + 60_000;
  setTime(now);
  await post({ action: "revive", round }, sessions[0]);
  await post({ action: "revive", round }, sessions[1]);
  const before = (await cat()).food_expires;
  setTime(now + 6000);
  await env.DB!.prepare("UPDATE cat SET food_expires=?").bind(before - foodLifetime / 2).run();
  const res = await json(await act(sessions[0], "food"));
  expect(res.error).toBeUndefined();
  const points = (await env.DB!.prepare("SELECT points FROM actions WHERE action='food'").first()) as { points: number };
  expect(points.points).toBe(effectivePoints("food", 5, "normal"));
  expect((await cat()).food_expires - (before - foodLifetime / 2)).toBe(32_400_000);
});
