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
