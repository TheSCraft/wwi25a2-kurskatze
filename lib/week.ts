const TZ = "Europe/Berlin";
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function berlinParts(ms: number) {
  const p = Object.fromEntries(formatter.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour, minute: +p.minute, second: +p.second };
}

// Abstand der Berliner Wanduhr zu UTC zum Zeitpunkt ms (in ms).
function berlinOffset(ms: number) {
  const p = berlinParts(ms);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

// Montag 00:00 Uhr (Europe/Berlin) der Woche von `now`, in Millisekunden.
// Der Offset wird an dem UTC-Zeitpunkt ausgewertet, der zahlenmäßig dem lokalen Montag 00:00 entspricht
// (in Berlin 01:00 bzw. 02:00, also noch derselbe Montag). Die Zeitumstellung liegt in der Nacht
// zu Sonntag, der Offset ist daher eindeutig.
export function weekStart(now: number): number {
  const p = berlinParts(now);
  const index = (new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() + 6) % 7; // So 0 -> 6, Mo 1 -> 0
  const localMidnight = Date.UTC(p.year, p.month - 1, p.day - index);
  return localMidnight - berlinOffset(localMidnight);
}

// Beginn der folgenden Woche.
export function nextWeekStart(now: number): number {
  return weekStart(weekStart(now) + 7 * DAY + 12 * HOUR);
}
