import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { nextWeekStart, weekStart } from "../lib/week";
import { weekBoardSql } from "../lib/server/state";
import { rules } from "../lib/cat-rules";
import { T0, act, get, json, register, setTime } from "./helpers";

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

test("die Wochenabfrage nutzt den Index auf at und nicht den auf player", async () => {
  const plan = await env.DB!.prepare("EXPLAIN QUERY PLAN " + weekBoardSql).bind(0).all<{ detail: string }>();
  const details = plan.results.map((r) => r.detail);
  expect(details.some((d) => d.includes("actions_at_idx"))).toBe(true);
  expect(details.some((d) => d.includes("actions_player_at_idx"))).toBe(false);
});

test("Aktion wirkt über das Protokoll bis in weekBoard und me", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  await get(session);
  setTime(T0 + 6000);
  await act(session, "food");
  const body = await json(await get(session));
  expect(body.weekBoard).toEqual([{ name: "Lisa", points: rules.food.points }]);
  expect(body.me.points).toBe(rules.food.points);
});
