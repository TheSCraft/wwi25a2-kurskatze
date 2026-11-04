import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { actionGain, foodLifetime, minimumTeamSize, rules } from "../lib/cat-rules";
import { effectivePoints } from "../lib/mood";
import { unit } from "../lib/server/db";
import { T0, act, get, json, register, setTime } from "./helpers";

const SECOND = 1000;
const LIFETIME = foodLifetime;
const START = T0 + 6 * SECOND; // gemeinsame Pause (5 s) ist vorbei
const START_FOOD = T0 + 0.72 * LIFETIME; // neue Katze: 72 % Sättigung
const START_LOVE = T0 + 84 * unit; // neue Katze: 84 % Zuneigung

async function ready() {
  setTime(T0);
  const { session } = await register("Lisa");
  await get(session);
  setTime(START);
  return session;
}
// Stimmung neutral (50 % Zuneigung zum Zeitpunkt `at`) für Tests, die nicht von der Zuneigung handeln.
async function normalMood(at: number) {
  await env.DB!.prepare("UPDATE cat SET love=?").bind(at + 50 * unit).run();
}

// Bei einem Konto teilt der Server durch minimumTeamSize (8): Füttern bringt 100/8 = 12,5 % des Napfs.
test("Füttern gibt 5 Punkte und ergänzt die Sättigung um 1/8 des Napfs (72 -> 85 %)", async () => {
  const session = await ready();
  await normalMood(START);
  const res = await act(session, "food");
  expect(res.status).toBe(200);
  const body = (await json(res));
  expect(body.me.points).toBe(rules.food.points);
  const expires = START_FOOD + Math.trunc(rules.food.food * LIFETIME / 100 / minimumTeamSize);
  expect(body.foodExpires).toBe(expires);
  expect(body.food).toBe(Math.ceil((expires - START) * 100 / LIFETIME));
  expect(body.food).toBe(85); // 72 + 12,5 = 84,5, aufgerundet
  expect(body.playerCount).toBe(1);
});

test("Streicheln hebt die Zuneigung um 12,5 Prozentpunkte (84 -> 97 %), die Sättigung bleibt", async () => {
  const session = await ready();
  const body = (await json(await act(session, "love")));
  const love = START_LOVE + rules.love.love * unit / minimumTeamSize;
  expect(body.love).toBe(Math.ceil((love - START) / unit));
  expect(body.love).toBe(97); // 84 + 12,5 = 96,5, aufgerundet
  expect(body.me.points).toBe(effectivePoints("love", rules.love.points, "happy")); // Startzuneigung 84 %: Bonus
  expect(body.foodExpires).toBe(START_FOOD);
});

test("Miauen gibt 1 Punkt, zählt calls hoch und ändert weder Sättigung noch Zuneigung", async () => {
  const session = await ready();
  const before = (await json(await get(session)));
  const body = (await json(await act(session, "meow")));
  expect(body.me.points).toBe(rules.meow.points);
  expect(body.calls).toBe(1);
  expect(rules.meow.love).toBe(0);
  expect(body.foodExpires).toBe(before.foodExpires);
  expect(body.love).toBe(before.love);
});

// Ein Konto: 84 + 12,5 + 7,5 + 5 + 7,5 = 116,5 % ohne Deckel.
test("Zuneigung ist bei 100 % gedeckelt", async () => {
  const session = await ready();
  let t = T0 + 6 * SECOND;
  for (const action of ["love", "play", "study", "brush"]) {
    setTime(t);
    await act(session, action);
    t += 6 * SECOND;
  }
  setTime(t);
  const body = (await json(await get(session)));
  expect(body.love).toBe(100);
});

test("dieselbe Aktion hat einen eigenen Cooldown, andere Aktionen nicht", async () => {
  expect(rules.food.seconds).toBe(12 * 60 * 60);
  const session = await ready();
  expect((await act(session, "food")).status).toBe(200);
  setTime(T0 + 12 * SECOND);
  const again = await act(session, "food");
  expect(again.status).toBe(429);
  expect((await json(again)).error).toBe("Byte braucht noch einen Moment.");
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
  await normalMood(START);
  await act(session, "food");
  const body = (await json(await get(session)));
  expect(body.board).toEqual([{ name: "Lisa", points: 5 }]);
});

test("nach Ablauf der Lebensfrist ist Byte tot und Aktionen ergeben 409", async () => {
  const session = await ready();
  setTime(T0 + LIFETIME); // Startfrist ist nur 0,72 * 72 h
  const status = (await json(await get(session)));
  expect(status.food).toBe(0);
  const res = await act(session, "food");
  expect(res.status).toBe(409);
  expect((await json(res)).error).toBe(
    "Byte ist gestorben. Beteilige dich an der gemeinsamen Futterrunde.",
  );
});

test("nach Ablauf des Cooldowns wird dieselbe Aktion wieder angenommen", async () => {
  const session = await ready();
  await normalMood(START);
  expect((await act(session, "food")).status).toBe(200);
  // Zuneigung neutral halten: dieser Test prüft nur den Cooldown, nicht Bonus oder Schmollen nach 12 h Einsamkeit.
  await normalMood(START + rules.food.seconds * SECOND);
  setTime(START + (rules.food.seconds - 1) * SECOND);
  expect((await act(session, "food")).status).toBe(429);
  setTime(START + rules.food.seconds * SECOND); // Cooldown für food: 43200 s = 12 h
  const again = await act(session, "food");
  expect(again.status).toBe(200);
  const body = await json(again);
  expect(body.me.points).toBe(2 * rules.food.points);
  expect(body.foodExpires).toBe(START_FOOD + 2 * Math.trunc(LIFETIME * actionGain(rules.food.food, 1) / 100));
});
