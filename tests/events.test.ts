import { expect, test } from "vitest";
import { T0, get, json, register, setTime } from "./helpers";

const LIFETIME = 72 * 60 * 60 * 1000;

test("GET liefert events, auch ohne Anmeldung, anfangs leer", async () => {
  setTime(T0);
  const body = await json(await get());
  expect(body.events).toEqual([]);
});

test("solange Byte lebt, gibt es keinen died-Eintrag", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  const body = await json(await get(session));
  expect(body.events.filter((e: { type: string }) => e.type === "died")).toEqual([]);
});

test("Byte ist gestorben: genau ein died-Eintrag mit der Todeszeit, auch bei gleichzeitigen Abrufen", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  const round = (await json(await get(session))).foodExpires as number;
  setTime(T0 + LIFETIME); // länger als die Startfrist, Byte ist tot
  await Promise.all([get(session), get(session), get(session)]);
  const body = await json(await get(session));
  const died = body.events.filter((e: { type: string }) => e.type === "died");
  expect(died).toHaveLength(1);
  expect(died[0].at).toBe(round);
  expect(died[0].name).toBeNull();
});
