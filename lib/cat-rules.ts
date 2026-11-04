export const foodLifetime = 72 * 60 * 60 * 1000;
export const sharedPause = 5000;
export const minimumTeamSize = 8;
export function actionGain(amount: number, players: number) {
  return amount / Math.max(minimumTeamSize, players);
}
export const rules = {
  food: {points:5, seconds:43200, food:100, love:0},
  love: {points:5, seconds:21600, food:0, love:100},
  meow: {points:1, seconds:900, food:0, love:0},
  play: {points:6, seconds:21600, food:0, love:60},
  brush: {points:4, seconds:21600, food:0, love:60},
  study: {points:8, seconds:21600, food:0, love:40},
} as const;
