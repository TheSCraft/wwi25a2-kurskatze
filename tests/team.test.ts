import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { actionGain, foodLifetime, minimumTeamSize, rules } from "../lib/cat-rules";
import { unit } from "../lib/server/db";
import { T0, act, get, json, post, register, setTime } from "./helpers";

// Teamgröße: Die Wirkung jeder Aktion wird durch max(minimumTeamSize, Anzahl Passwort-Konten) geteilt.
// Die Konten zählt der Server im selben atomaren Batch wie das Update der Katze.

const START = T0 + 6000;
const START_FOOD = T0 + 0.72 * foodLifetime;
const START_LOVE = T0 + 84 * unit;
// Jede Registrierung rechnet PBKDF2 mit 100 000 Runden, daher mehr Zeit für Tests mit vielen Konten.
const SLOW = 60_000;

async function team(size: number) {
  setTime(T0);
  const sessions: string[] = [];
  for (let i = 0; i < size; i++) sessions.push((await register("Konto" + i)).session);
  await get(sessions[0]);
  setTime(START);
  return sessions;
}

const foodGain = (players: number) => Math.trunc(rules.food.food * foodLifetime / 100 / Math.max(minimumTeamSize, players));

test("actionGain teilt durch mindestens minimumTeamSize", () => {
  expect(minimumTeamSize).toBe(8);
  expect(actionGain(100, 0)).toBe(12.5);
  expect(actionGain(100, 1)).toBe(12.5);
  expect(actionGain(100, 8)).toBe(12.5);
  expect(actionGain(100, 10)).toBe(10);
  expect(actionGain(60, 12)).toBe(5);
});

test("unterhalb von minimumTeamSize (3 Konten) bleibt der Divisor 8", async () => {
  const [session] = await team(3);
  const body = await json(await act(session, "food"));
  expect(body.playerCount).toBe(3);
  expect(body.foodExpires).toBe(START_FOOD + foodGain(3));
  expect(foodGain(3)).toBe(foodGain(1));
}, SLOW);

test("mit mehr als minimumTeamSize Konten (10) wird die Wirkung durch die Kontenzahl geteilt", async () => {
  const [a, b] = await team(10);
  const fed = await json(await act(a, "food"));
  expect(fed.playerCount).toBe(10);
  expect(fed.foodExpires).toBe(START_FOOD + foodLifetime / 10);
  setTime(START + 6000);
  const loved = await json(await act(b, "love"));
  const love = START_LOVE + rules.love.love * unit / 10;
  expect(loved.love).toBe(Math.ceil((love - (START + 6000)) / unit)); // 84 + 10 = 94 %
  expect(loved.love).toBe(94);
}, SLOW);

test("playerCount im Zustand zählt nur Passwort-Konten, auch ohne Anmeldung", async () => {
  setTime(T0);
  expect((await json(await get())).playerCount).toBe(0);
  const lisa = await register("Lisa");
  expect(lisa.body.playerCount).toBe(1);
  await register("Tom");
  expect((await json(await get())).playerCount).toBe(2);
  expect((await json(await get(lisa.session))).playerCount).toBe(2);
  // Ein Spieler ohne Passwort (Altbestand) zählt nicht mit.
  await env.DB!.batch([
    env.DB!.prepare("INSERT INTO players(id,name,points,last) VALUES('alt','Alt',0,0)"),
    env.DB!.prepare("INSERT INTO accounts(player,key,password) VALUES('alt','user:alt',NULL)"),
  ]);
  expect((await json(await get())).playerCount).toBe(2);
  const out = await json(await post({ action: "logout" }, lisa.session));
  expect(out.playerCount).toBe(2);
});

test("eine neue Registrierung ändert den Divisor sofort, ohne dass der Client den Zustand neu lädt", async () => {
  const [session] = await team(9);
  expect((await json(await get(session))).playerCount).toBe(9);
  await register("Nachzügler"); // nach dem letzten Zustand, den der Client kennt
  const body = await json(await act(session, "food"));
  expect(body.foodExpires).toBe(START_FOOD + foodLifetime / 10);
  expect(body.playerCount).toBe(10);
}, SLOW);

test("Füttern kann die Sättigung nicht über 100 % heben", async () => {
  const [session] = await team(1);
  await env.DB!.prepare("UPDATE cat SET food_expires=? WHERE id=1").bind(START + foodLifetime - 1000).run();
  const body = await json(await act(session, "food"));
  expect(body.foodExpires).toBe(START + foodLifetime);
  expect(body.food).toBe(100);
});
