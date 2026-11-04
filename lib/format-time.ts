export function relativeTime(at: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - at) / 1000));
  if (seconds < 60) return "gerade eben";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "vor 1 Tag" : `vor ${days} Tagen`;
}

export function remainingTime(until: number, now: number): string {
  const seconds = Math.max(0, Math.floor((until - now) / 1000));
  if (seconds < 60) return "gleich";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `in ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "in 1 Tag" : `in ${days} Tagen`;
}
