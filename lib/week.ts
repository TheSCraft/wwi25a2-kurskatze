const TZ = "Europe/Berlin";
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function berlinParts(ms: number) {
  const p = Object.fromEntries(formatter.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { year: +p.year, month: +p.month, day: +p.day, weekday: p.weekday, hour: +p.hour, minute: +p.minute, second: +p.second };
}

// Abstand der Berliner Wanduhr zu UTC zum Zeitpunkt ms (in ms).
function berlinOffset(ms: number) {
  const p = berlinParts(ms);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

// Montag 00:00 Uhr (Europe/Berlin) der Woche von `now`, in Millisekunden.
// Die Zeitumstellung liegt in der Nacht zu Sonntag, der Offset am Montag ist eindeutig.
export function weekStart(now: number): number {
  const p = berlinParts(now);
  const index = WEEKDAYS.indexOf(p.weekday);
  const localMidnight = Date.UTC(p.year, p.month - 1, p.day - index);
  return localMidnight - berlinOffset(localMidnight);
}

// Beginn der folgenden Woche.
export function nextWeekStart(now: number): number {
  return weekStart(weekStart(now) + 7 * DAY + 12 * HOUR);
}
