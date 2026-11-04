import { expect, test } from "vitest";
import { T0, get, post, json, register, setTime } from "./helpers";

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

type Ev = { type: string; at: number; name: string | null };
const types = (events: Ev[]) => events.map((e) => e.type);

async function deadWith(...names: string[]) {
  setTime(T0);
  const sessions: string[] = [];
  for (const name of names) sessions.push((await register(name)).session);
  await get(sessions[0]);
  setTime(T0 + LIFETIME);
  const state = await json(await get(sessions[0]));
  return { sessions, round: state.foodExpires as number };
}

test("Registrieren schreibt genau einen joined-Eintrag", async () => {
  setTime(T0);
  const { body } = await register("Lisa");
  expect(body.events).toMatchObject([{ type: "joined", at: T0, name: "Lisa" }]);
});

test("eine fehlgeschlagene Registrierung schreibt keinen Eintrag", async () => {
  setTime(T0);
  await register("Lisa");
  const dup = await register("lisa");
  expect(dup.res.status).toBe(409);
  const body = await json(await get());
  expect(types(body.events)).toEqual(["joined"]);
});

test("abgemeldete Besucher sehen die Ereignisse ebenfalls", async () => {
  setTime(T0);
  await register("Lisa");
  const body = await json(await get());
  expect(body.account).toBe(false);
  expect(types(body.events)).toEqual(["joined"]);
});

test("eine Portion schreibt revive_portion, die zweite desselben Kontos keinen weiteren Eintrag", async () => {
  const { sessions, round } = await deadWith("Lisa", "Tom");
  const first = await json(await post({ action: "revive", round }, sessions[0]));
  expect(types(first.events)).toEqual(["revive_portion", "died", "joined", "joined"]);
  expect(first.events[0]).toMatchObject({ type: "revive_portion", at: T0 + LIFETIME, name: "Lisa" });
  const again = await post({ action: "revive", round }, sessions[0]);
  expect(again.status).toBe(409);
  const body = await json(await get(sessions[0]));
  expect(types(body.events)).toEqual(["revive_portion", "died", "joined", "joined"]);
});

test("die letzte Portion schreibt revived", async () => {
  const { sessions, round } = await deadWith("Lisa", "Tom");
  await post({ action: "revive", round }, sessions[0]);
  const last = await json(await post({ action: "revive", round }, sessions[1]));
  expect(types(last.events)).toEqual(["revived", "revive_portion", "revive_portion", "died", "joined", "joined"]);
  expect(last.events[0]).toMatchObject({ type: "revived", at: T0 + LIFETIME, name: null });
  expect(last.events[1].name).toBe("Tom");
  expect(last.events[2].name).toBe("Lisa");
});

test("wer nicht zur Runde gehört, schreibt keinen revive_portion", async () => {
  const { sessions, round } = await deadWith("Lisa", "Tom");
  const late = await register("Nina"); // erst nach dem Verhungern registriert
  await post({ action: "revive", round }, sessions[0]); // Positivkontrolle: Lisa zählt
  const res = await post({ action: "revive", round }, late.session);
  expect(res.status).toBe(409);
  const body = await json(await get(sessions[0]));
  const portions = body.events.filter((e: Ev) => e.type === "revive_portion");
  expect(portions).toHaveLength(1);
  expect(portions[0].name).toBe("Lisa");
});

test("wer nicht in dieser Runde gestimmt hat, schreibt kein revived", async () => {
  const { round } = await deadWith("Lisa");
  const late = await register("Nina");
  const res = await post({ action: "revive", round }, late.session);
  expect(res.status).toBe(409);
  const body = await json(await get());
  expect(types(body.events)).not.toContain("revived");
});

test("died wird auch geschrieben, wenn die erste Anfrage nach dem Tod die letzte Portion ist", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  const round = (await json(await get(session))).foodExpires as number;
  setTime(T0 + LIFETIME); // kein GET dazwischen
  const body = await json(await post({ action: "revive", round }, session));
  expect(types(body.events)).toEqual(["revived", "revive_portion", "died", "joined"]);
  expect(body.events[2].at).toBe(round);
});

test("Reihenfolge neueste zuerst, höchstens 10 Einträge", async () => {
  let last: Ev[] = [];
  for (let i = 0; i < 12; i++) {
    setTime(T0 + i * 1000);
    last = (await register(`Spieler${i}`)).body.events;
  }
  expect(last).toHaveLength(10);
  expect(last[0].name).toBe("Spieler11");
  expect(last[9].name).toBe("Spieler2");
}, 30_000);

test("nach dem Umbenennen erscheint der neue Name", async () => {
  setTime(T0);
  const { session } = await register("Lisa");
  await post({ action: "rename", name: "Lisbeth" }, session);
  const body = await json(await get(session));
  expect(body.events[0]).toMatchObject({ type: "joined", name: "Lisbeth" });
});
