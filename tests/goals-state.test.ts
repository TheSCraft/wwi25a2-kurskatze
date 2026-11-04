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
