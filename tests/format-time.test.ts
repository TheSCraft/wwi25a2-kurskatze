import { expect, test } from "vitest";
import { relativeTime, remainingTime } from "../lib/format-time";

const S = 1000;
const MIN = 60 * S;
const H = 60 * MIN;
const D = 24 * H;
const NOW = 1_800_000_000_000;

test("relativeTime: Grenzen und Einzahl/Mehrzahl", () => {
  expect(relativeTime(NOW - 59 * S, NOW)).toBe("gerade eben");
  expect(relativeTime(NOW - 60 * S, NOW)).toBe("vor 1 Min.");
  expect(relativeTime(NOW - 59 * MIN, NOW)).toBe("vor 59 Min.");
  expect(relativeTime(NOW - 60 * MIN, NOW)).toBe("vor 1 Std.");
  expect(relativeTime(NOW - 23 * H, NOW)).toBe("vor 23 Std.");
  expect(relativeTime(NOW - 24 * H, NOW)).toBe("vor 1 Tag");
  expect(relativeTime(NOW - 48 * H, NOW)).toBe("vor 2 Tagen");
  expect(relativeTime(NOW - 10 * D, NOW)).toBe("vor 10 Tagen");
});

test("relativeTime: Zeitpunkt in der Zukunft gilt als gerade eben", () => {
  expect(relativeTime(NOW + 5 * S, NOW)).toBe("gerade eben");
});

test("remainingTime: Grenzen und Einzahl/Mehrzahl", () => {
  expect(remainingTime(NOW + 59 * S, NOW)).toBe("gleich");
  expect(remainingTime(NOW + 60 * S, NOW)).toBe("in 1 Min.");
  expect(remainingTime(NOW + 59 * MIN, NOW)).toBe("in 59 Min.");
  expect(remainingTime(NOW + 60 * MIN, NOW)).toBe("in 1 Std.");
  expect(remainingTime(NOW + 23 * H, NOW)).toBe("in 23 Std.");
  expect(remainingTime(NOW + 24 * H, NOW)).toBe("in 1 Tag");
  expect(remainingTime(NOW + 48 * H, NOW)).toBe("in 2 Tagen");
  expect(remainingTime(NOW + 6 * D, NOW)).toBe("in 6 Tagen");
});

test("remainingTime: abgelaufen gilt als gleich", () => {
  expect(remainingTime(NOW - 5 * S, NOW)).toBe("gleich");
});
