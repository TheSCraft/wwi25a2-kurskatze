// Stimmung von Byte nach Zuneigung. Alle Zahlen an einer Stelle, bewusst nicht in lib/cat-rules.ts.
export const loveUnit = 360000; // gleich `unit` in lib/server/db.ts (ein Test prüft die Gleichheit)
export const happyFrom = 70; // ab dieser Zuneigung (in %) gilt der Punkte-Bonus
export const normalFrom = 30; // darunter ist Byte einsam
export const reviveLove = 30; // Zuneigung (in %), auf die eine Wiederbelebung Byte mindestens bringt
export const happyBonus = 1.25;
export const sulkGrace = 2 * 60 * 60 * 1000; // Schutzfrist: so lange bei 0 %, bevor Byte schmollt
export const hungerExtra = 0.5; // zusätzlicher Hunger (1,5-fach insgesamt) beim Schmollen
export const settleStep = 60000; // Abrechnung des Hungers höchstens einmal pro Minute

export type Mood = "happy" | "normal" | "lonely" | "sulking";

export function lovePercent(loveExpires: number, now: number): number {
  return Math.max(0, Math.ceil((loveExpires - now) / loveUnit));
}

export function moodLevel(loveExpires: number, now: number): Mood {
  const percent = lovePercent(loveExpires, now);
  if (percent >= happyFrom) return "happy";
  if (percent >= normalFrom) return "normal";
  if (percent >= 1) return "lonely";
  return now >= loveExpires + sulkGrace ? "sulking" : "lonely";
}

export function effectivePoints(action: string, points: number, level: Mood): number {
  if (level === "happy") return Math.round(points * happyBonus);
  if (level === "sulking" && (action === "food" || action === "meow")) return Math.max(1, Math.ceil(points / 2));
  return points;
}

// Die 0.5 hier (halbe Futterwirkung) ist unabhängig von `hungerExtra` (das ist der zusätzliche HUNGER-Faktor).
export function foodFactor(level: Mood): number {
  return level === "sulking" ? 0.5 : 1;
}
