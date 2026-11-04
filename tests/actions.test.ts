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
  // Spielraum: Die vorbereitete Katze hat rund 51,8 h Futter, dazu kommen 9 h aus der Fütterung;
  // bei T0 + 72 h ist sie also tot.
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
