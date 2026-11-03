export const lifetime = 72 * 60 * 60 * 1000;
export const sharedPause = 5000;
export const rules = {
  food: {points:5, seconds:180, food:12, love:0},
  love: {points:5, seconds:90, food:0, love:12},
  meow: {points:1, seconds:30, food:0, love:2},
  play: {points:6, seconds:240, food:0, love:16},
  brush: {points:4, seconds:120, food:0, love:10},
  study: {points:8, seconds:300, food:0, love:18},
} as const;
