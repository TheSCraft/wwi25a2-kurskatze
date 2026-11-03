import { expect, test } from "vitest";
import { T0, get, json, setTime } from "./helpers";

test("GET legt Byte mit 72 % Sättigung und 84 % Zuneigung an", async () => {
  setTime(T0);
  const res = await get();
  expect(res.status).toBe(200);
  const body = (await json(res));
  expect(body.food).toBe(72);
  expect(body.love).toBe(84);
  expect(body.account).toBe(false);
  expect(body.board).toEqual([]);
});
