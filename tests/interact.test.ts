import { expect, test } from "vitest";
import { T0, act, get, register, setTime } from "./helpers";

const SECOND = 1000;
const LIFETIME = 72 * 60 * 60 * 1000;

async function ready() {
  setTime(T0);
  const { session } = await register("Lisa");
  await get(session);
  setTime(T0 + 6 * SECOND); // gemeinsame Pause (5 s) ist vorbei
  return session;
}

test("Füttern gibt 5 Punkte und setzt die Sättigung auf 100 %", async () => {
  const session = await ready();
  const res = await act(session, "food");
  expect(res.status).toBe(200);
  const body = (await res.json()) as any;
  expect(body.me.points).toBe(5);
  expect(body.food).toBe(100);
  expect(body.foodExpires).toBe(T0 + 6 * SECOND + LIFETIME);
});

test("Streicheln hebt die Zuneigung von 84 auf 96 %", async () => {
  const session = await ready();
  const body = (await (await act(session, "love")).json()) as any;
  expect(body.love).toBe(96);
  expect(body.me.points).toBe(5);
});

test("Miauen gibt 1 Punkt und zählt calls hoch", async () => {
  const session = await ready();
  const body = (await (await act(session, "meow")).json()) as any;
  expect(body.me.points).toBe(1);
  expect(body.calls).toBe(1);
});

test("Zuneigung ist bei 100 % gedeckelt", async () => {
  const session = await ready();
  let t = T0 + 6 * SECOND;
  for (const action of ["love", "play", "study", "brush"]) {
    setTime(t);
    await act(session, action);
    t += 6 * SECOND;
  }
  setTime(t);
  const body = (await (await get(session)).json()) as any;
  expect(body.love).toBe(100);
});

test("dieselbe Aktion hat einen eigenen Cooldown, andere Aktionen nicht", async () => {
  const session = await ready();
  expect((await act(session, "food")).status).toBe(200);
  setTime(T0 + 12 * SECOND);
  const again = await act(session, "food");
  expect(again.status).toBe(429);
  expect(((await again.json()) as any).error).toBe("Byte braucht noch einen Moment.");
  const other = await act(session, "meow");
  expect(other.status).toBe(200);
});

test("gemeinsame Pause: eine zweite Aktion binnen 5 s wird abgelehnt", async () => {
  const session = await ready();
  expect((await act(session, "meow")).status).toBe(200);
  setTime(T0 + 6 * SECOND + 2 * SECOND);
  expect((await act(session, "love")).status).toBe(429);
  setTime(T0 + 6 * SECOND + 6 * SECOND);
  expect((await act(session, "love")).status).toBe(200);
});

test("unbekannte Aktion ergibt 400", async () => {
  const session = await ready();
  expect((await act(session, "fliegen")).status).toBe(400);
});

test("Rangliste enthält nur Konten und ist nach Punkten sortiert", async () => {
  const session = await ready();
  await act(session, "food");
  const body = (await (await get(session)).json()) as any;
  expect(body.board).toEqual([{ name: "Lisa", points: 5 }]);
});

test("nach Ablauf der Lebensfrist ist Byte tot und Aktionen ergeben 409", async () => {
  const session = await ready();
  setTime(T0 + LIFETIME); // Startfrist ist nur 0,72 * 72 h
  const status = (await (await get(session)).json()) as any;
  expect(status.food).toBe(0);
  const res = await act(session, "food");
  expect(res.status).toBe(409);
  expect(((await res.json()) as any).error).toBe(
    "Byte ist gestorben. Beteilige dich an der gemeinsamen Futterrunde.",
  );
});
