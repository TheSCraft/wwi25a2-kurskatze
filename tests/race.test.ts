import { expect, test } from "vitest";
import { T0, act, get, register, setTime } from "./helpers";

test("zwei gleichzeitige Aktionen im selben Moment: nur eine wird angenommen", async () => {
  setTime(T0);
  const a = await register("Lisa");
  const b = await register("Tom");
  await get(a.session);
  setTime(T0 + 6000);
  const [r1, r2] = await Promise.all([act(a.session, "food"), act(b.session, "food")]);
  expect([r1.status, r2.status].sort()).toEqual([200, 429]);
  const board = ((await (await get(a.session)).json()) as any).board as { points: number }[];
  expect(board.reduce((sum, p) => sum + p.points, 0)).toBe(5);
});
