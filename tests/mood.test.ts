import { expect, test } from "vitest";
import { effectivePoints, foodFactor, loveUnit, lovePercent, moodLevel, sulkGrace } from "../lib/mood";
import { unit } from "../lib/server/db";

const NOW = 1_800_000_000_000;
const at = (percent: number) => NOW + percent * loveUnit; // loveExpires für genau `percent` Prozent

test("loveUnit entspricht der Einheit in lib/server/db.ts", () => {
  expect(loveUnit).toBe(unit);
});

test("lovePercent rundet auf und ist nie negativ", () => {
  expect(lovePercent(at(70), NOW)).toBe(70);
  expect(lovePercent(NOW + 1, NOW)).toBe(1);
  expect(lovePercent(NOW, NOW)).toBe(0);
  expect(lovePercent(NOW - 5 * loveUnit, NOW)).toBe(0);
});

test("moodLevel: Grenzen 70/69, 30/29, 1/0", () => {
  expect(moodLevel(at(100), NOW)).toBe("happy");
  expect(moodLevel(at(70), NOW)).toBe("happy");
  expect(moodLevel(at(69), NOW)).toBe("normal");
  expect(moodLevel(at(30), NOW)).toBe("normal");
  expect(moodLevel(at(29), NOW)).toBe("lonely");
  expect(moodLevel(NOW + 1, NOW)).toBe("lonely"); // 1 %
});

test("moodLevel: bei 0 % erst nach der Schutzfrist schmollend", () => {
  const love = NOW;
  expect(moodLevel(love, NOW)).toBe("lonely");
  expect(moodLevel(love, NOW + sulkGrace - 1)).toBe("lonely");
  expect(moodLevel(love, NOW + sulkGrace)).toBe("sulking");
  expect(moodLevel(love, NOW + sulkGrace + 1)).toBe("sulking");
});

test("effectivePoints: Bonus bei happy, Halbierung beim Schmollen nur für food und meow", () => {
  expect(effectivePoints("food", 5, "happy")).toBe(6);
  expect(effectivePoints("love", 5, "happy")).toBe(6);
  expect(effectivePoints("meow", 1, "happy")).toBe(1);
  expect(effectivePoints("play", 6, "happy")).toBe(8);
  expect(effectivePoints("brush", 4, "happy")).toBe(5);
  expect(effectivePoints("study", 8, "happy")).toBe(10);
  expect(effectivePoints("food", 5, "sulking")).toBe(3);
  expect(effectivePoints("meow", 1, "sulking")).toBe(1);
  for (const [action, points] of [["love", 5], ["play", 6], ["brush", 4], ["study", 8]] as const) {
    expect(effectivePoints(action, points, "sulking")).toBe(points);
  }
  for (const level of ["normal", "lonely"] as const) {
    expect(effectivePoints("food", 5, level)).toBe(5);
    expect(effectivePoints("study", 8, level)).toBe(8);
  }
});

test("foodFactor: halb beim Schmollen", () => {
  expect(foodFactor("sulking")).toBe(0.5);
  expect(foodFactor("happy")).toBe(1);
  expect(foodFactor("normal")).toBe(1);
  expect(foodFactor("lonely")).toBe(1);
});
