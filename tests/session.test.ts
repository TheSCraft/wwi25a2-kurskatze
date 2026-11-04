import { expect, test } from "vitest";
import { T0, get, json, register, setTime } from "./helpers";

const DAY = 86_400_000;

test("ein Token im falschen Format zählt nicht als Anmeldung", async () => {
  setTime(T0);
  await register("Lisa");
  const body = await json(await get("kein-gueltiges-token"));
  expect(body.account).toBe(false);
  expect(body.me).toBeNull();
});

test("ein wohlgeformtes, aber unbekanntes Token zählt nicht als Anmeldung", async () => {
  setTime(T0);
  await register("Lisa");
  const body = await json(await get("0123456789abcdef0123456789abcdef"));
  expect(body.account).toBe(false);
  expect(body.me).toBeNull();
});

test("eine Session läuft nach 30 Tagen ab", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  setTime(T0 + 30 * DAY - 1000);
  expect((await json(await get(session))).account).toBe(true);
  setTime(T0 + 30 * DAY + 1000);
  expect((await json(await get(session))).account).toBe(false);
});
