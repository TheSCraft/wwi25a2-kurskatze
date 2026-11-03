import { expect, test } from "vitest";
import { T0, get, post, json, register, setTime } from "./helpers";

const LIFETIME = 72 * 60 * 60 * 1000;

async function deadWith(...names: string[]) {
  setTime(T0);
  const sessions: string[] = [];
  for (const name of names) sessions.push((await register(name)).session);
  await get(sessions[0]);
  setTime(T0 + LIFETIME); // länger als die Startfrist, Byte ist tot
  const state = (await json(await get(sessions[0])));
  return { sessions, round: state.foodExpires as number };
}

test("alle Konten füttern, dann lebt Byte wieder", async () => {
  const { sessions, round } = await deadWith("Lisa", "Tom");
  const first = (await json(await post({ action: "revive", round }, sessions[0])));
  expect(first.revival).toMatchObject({ total: 2, fed: 1, contributed: 1 });
  expect(first.food).toBe(0);
  const second = await post({ action: "revive", round }, sessions[1]);
  expect(second.status).toBe(200);
  const body = (await json(second));
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
  const last = (await json(await post({ action: "revive", round }, sessions[1])));
  expect(last.food).toBe(100);
});

test("eine ungültige oder zukünftige Runde wird abgelehnt", async () => {
  const { sessions, round } = await deadWith("Lisa");
  expect((await post({ action: "revive", round: round + 10_000_000_000 }, sessions[0])).status).toBe(400);
  expect((await post({ action: "revive", round: "x" }, sessions[0])).status).toBe(400);
});
