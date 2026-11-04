import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { unit } from "../lib/server/db";
import { T0, act, get, json, register, setTime } from "./helpers";

// Prüft die Invariante "nur eine von zwei Aktionen im selben Moment wird angenommen, die
// Punkte werden genau einmal vergeben" (gemeinsame Pause von 5 s, ein einziger D1-Batch).
// Echte Parallelität beweist der Test nicht: Die Laufzeit kann die beiden Anfragen
// nacheinander abarbeiten, dann deckt er dieselbe Logik ab wie ein sequenzieller Ablauf.
test("zwei gleichzeitige Aktionen im selben Moment: nur eine wird angenommen", async () => {
  setTime(T0);
  const a = await register("Lisa");
  const b = await register("Tom");
  await get(a.session);
  setTime(T0 + 6000);
  // Stimmung neutral (50 %): der Test prüft die einmalige Vergabe, nicht den Bonus der Startzuneigung.
  await env.DB!.prepare("UPDATE cat SET love=?").bind(T0 + 6000 + 50 * unit).run();
  const [r1, r2] = await Promise.all([act(a.session, "food"), act(b.session, "food")]);
  expect([r1.status, r2.status].sort()).toEqual([200, 429]);
  const board = (await json(await get(a.session))).board as { points: number }[];
  expect(board.reduce((sum, p) => sum + p.points, 0)).toBe(5);
});
