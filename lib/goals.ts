export type Counters = { calls: number; actions: number; points: number; revivals: number };
export type GoalKind = keyof Counters;
export type Effect = "gold-bowl" | "stars" | "sunrise" | "glow";
export type Goal = {
  id: string;
  kind: GoalKind;
  target: number;
  badge: string;
  icon: string;
  title?: string;
  effect?: Effect;
};

export const defaultTitle = "Kurskatze";

// Zielleiter des Kurses. Die Schwellen sind geschätzt (etwa 30 Konten) und hier an einer Stelle änderbar.
export const goals: Goal[] = [
  { id: "calls-100", kind: "calls", target: 100, badge: "Erste Miau-Runde", icon: "Megaphone", effect: "gold-bowl" },
  { id: "calls-500", kind: "calls", target: 500, badge: "Lautstarker Kurs", icon: "Volume2", effect: "stars" },
  { id: "calls-2000", kind: "calls", target: 2000, badge: "Miau-Chor", icon: "Music", effect: "sunrise" },
  { id: "calls-10000", kind: "calls", target: 10000, badge: "Legendäres Miau", icon: "Crown", effect: "glow" },
  { id: "actions-50", kind: "actions", target: 50, badge: "Fleißiger Kurs", icon: "Fish" },
  { id: "actions-250", kind: "actions", target: 250, badge: "Vollzeit-Pfleger", icon: "Brush" },
  { id: "actions-1000", kind: "actions", target: 1000, badge: "Dauerbetreuung", icon: "Gamepad2" },
  { id: "points-500", kind: "points", target: 500, badge: "Hörsaal-Stammgast", icon: "GraduationCap", title: "Hörsaal-Stammgast" },
  { id: "points-2500", kind: "points", target: 2500, badge: "Dozent h. c.", icon: "BookOpen", title: "Dozent h. c." },
  { id: "points-10000", kind: "points", target: 10000, badge: "Professor Byte", icon: "Award", title: "Professor Byte" },
  { id: "revivals-1", kind: "revivals", target: 1, badge: "Gemeinsam gerettet", icon: "LifeBuoy" },
  { id: "revivals-3", kind: "revivals", target: 3, badge: "Neun Leben", icon: "Sparkles" },
];

const titleOrder = ["points-10000", "points-2500", "points-500"];

export function goalById(id: string): Goal | undefined {
  return goals.find((g) => g.id === id);
}

// Ziele, deren Zähler die Schwelle erreicht hat und die noch nicht erreicht gespeichert sind.
export function newlyReached(counters: Counters, reachedIds: Iterable<string>): Goal[] {
  const done = new Set(reachedIds);
  return goals.filter((g) => !done.has(g.id) && counters[g.kind] >= g.target);
}

export function unlockedTitle(reachedIds: Iterable<string>): string {
  const done = new Set(reachedIds);
  for (const id of titleOrder) {
    if (done.has(id)) return goalById(id)!.title!;
  }
  return defaultTitle;
}

export function unlockedEffects(reachedIds: Iterable<string>): Effect[] {
  const done = new Set(reachedIds);
  return goals.filter((g) => g.effect && done.has(g.id)).map((g) => g.effect!);
}

export function nextGoal(kind: GoalKind, reachedIds: Iterable<string>): Goal | undefined {
  const done = new Set(reachedIds);
  return goals.find((g) => g.kind === kind && !done.has(g.id));
}
