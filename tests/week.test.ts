import { expect, test } from "vitest";
import { nextWeekStart, weekStart } from "../lib/week";

const t = (iso: string) => Date.parse(iso);

test("weekStart: Winterzeit, Mittwoch", () => {
  expect(weekStart(t("2026-11-04T09:00:00Z"))).toBe(t("2026-11-01T23:00:00Z"));
  expect(nextWeekStart(t("2026-11-04T09:00:00Z"))).toBe(t("2026-11-08T23:00:00Z"));
});

test("weekStart: Sommerzeit, Mittwoch", () => {
  expect(weekStart(t("2026-07-15T12:00:00Z"))).toBe(t("2026-07-12T22:00:00Z"));
  expect(nextWeekStart(t("2026-07-15T12:00:00Z"))).toBe(t("2026-07-19T22:00:00Z"));
});

test("weekStart: Grenze Sonntag 23:59:59 gegen Montag 00:00:00 (Berlin)", () => {
  expect(weekStart(t("2026-11-08T22:59:59Z"))).toBe(t("2026-11-01T23:00:00Z"));
  expect(weekStart(t("2026-11-08T23:00:00Z"))).toBe(t("2026-11-08T23:00:00Z"));
  expect(weekStart(t("2026-11-01T22:59:59Z"))).toBe(t("2026-10-25T23:00:00Z"));
  expect(weekStart(t("2026-11-01T23:00:00Z"))).toBe(t("2026-11-01T23:00:00Z"));
});

test("weekStart: Woche mit Beginn der Sommerzeit (29.03.2026)", () => {
  expect(weekStart(t("2026-03-29T12:00:00Z"))).toBe(t("2026-03-22T23:00:00Z"));
  expect(weekStart(t("2026-03-29T00:30:00Z"))).toBe(t("2026-03-22T23:00:00Z"));
  expect(nextWeekStart(t("2026-03-29T12:00:00Z"))).toBe(t("2026-03-29T22:00:00Z"));
});

test("weekStart: Woche mit Ende der Sommerzeit (25.10.2026)", () => {
  expect(weekStart(t("2026-10-25T12:00:00Z"))).toBe(t("2026-10-18T22:00:00Z"));
  expect(weekStart(t("2026-10-25T00:30:00Z"))).toBe(t("2026-10-18T22:00:00Z"));
  expect(nextWeekStart(t("2026-10-25T12:00:00Z"))).toBe(t("2026-10-25T23:00:00Z"));
});
