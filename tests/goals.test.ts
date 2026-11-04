import { expect, test } from "vitest";
import { defaultTitle, goalById, goals, nextGoal, newlyReached, unlockedEffects, unlockedTitle } from "../lib/goals";

const zero = { calls: 0, actions: 0, points: 0, revivals: 0 };

test("zwölf Ziele mit eindeutigen Ids", () => {
  expect(goals).toHaveLength(12);
  expect(new Set(goals.map((g) => g.id)).size).toBe(12);
  expect(goalById("calls-500")).toMatchObject({ kind: "calls", target: 500, badge: "Lautstarker Kurs", effect: "stars" });
  expect(goalById("gibt-es-nicht")).toBeUndefined();
});

test("newlyReached: Grenze 99 gegen 100, genau auf der Schwelle", () => {
  expect(newlyReached({ ...zero, calls: 99 }, [])).toEqual([]);
  expect(newlyReached({ ...zero, calls: 100 }, []).map((g) => g.id)).toEqual(["calls-100"]);
});

test("newlyReached: mehrere Ziele auf einmal und bereits erreichte werden ausgeschlossen", () => {
  const counters = { calls: 1500, actions: 60, points: 0, revivals: 1 };
  expect(newlyReached(counters, []).map((g) => g.id)).toEqual(["calls-100", "calls-500", "actions-50", "revivals-1"]);
  expect(newlyReached(counters, ["calls-100", "revivals-1"]).map((g) => g.id)).toEqual(["calls-500", "actions-50"]);
  expect(newlyReached(counters, new Set(["calls-100", "calls-500", "actions-50", "revivals-1"]))).toEqual([]);
});

test("unlockedTitle: höchster Titel, sonst Kurskatze", () => {
  expect(unlockedTitle([])).toBe(defaultTitle);
  expect(defaultTitle).toBe("Kurskatze");
  expect(unlockedTitle(["points-500"])).toBe("Hörsaal-Stammgast");
  expect(unlockedTitle(["points-500", "points-2500"])).toBe("Dozent h. c.");
  expect(unlockedTitle(["points-2500", "points-10000", "points-500"])).toBe("Professor Byte");
  expect(unlockedTitle(["calls-100", "actions-50"])).toBe("Kurskatze");
});

test("unlockedEffects: nur Optiken erreichter Ziele in Zielreihenfolge", () => {
  expect(unlockedEffects([])).toEqual([]);
  expect(unlockedEffects(["calls-500", "calls-100", "points-500"])).toEqual(["gold-bowl", "stars"]);
  expect(unlockedEffects(goals.map((g) => g.id))).toEqual(["gold-bowl", "stars", "sunrise", "glow"]);
});

test("nextGoal: nächstes offenes Ziel je Messgröße", () => {
  expect(nextGoal("calls", [])?.id).toBe("calls-100");
  expect(nextGoal("calls", ["calls-100", "calls-500"])?.id).toBe("calls-2000");
  expect(nextGoal("revivals", ["revivals-1", "revivals-3"])).toBeUndefined();
  expect(nextGoal("points", ["points-500"])?.target).toBe(2500);
});
