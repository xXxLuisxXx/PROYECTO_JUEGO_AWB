const LEVEL_DIFFICULTY = [
  { target: 7, spawnDelay: 950, fruitSpeed: 1, gravityScale: 1, maxActiveFruits: 3, bombChance: 0.03 },
  { target: 9, spawnDelay: 920, fruitSpeed: 1.04, gravityScale: 1.01, maxActiveFruits: 3, bombChance: 0.04 },
  { target: 11, spawnDelay: 890, fruitSpeed: 1.08, gravityScale: 1.02, maxActiveFruits: 3, bombChance: 0.05 },
  { target: 13, spawnDelay: 860, fruitSpeed: 1.12, gravityScale: 1.03, maxActiveFruits: 3, bombChance: 0.06 },
  { target: 15, spawnDelay: 830, fruitSpeed: 1.16, gravityScale: 1.04, maxActiveFruits: 4, bombChance: 0.06 },
  { target: 17, spawnDelay: 800, fruitSpeed: 1.18, gravityScale: 1.05, maxActiveFruits: 4, bombChance: 0.07 },
  { target: 19, spawnDelay: 770, fruitSpeed: 1.2, gravityScale: 1.06, maxActiveFruits: 4, bombChance: 0.08 },
  { target: 21, spawnDelay: 740, fruitSpeed: 1.22, gravityScale: 1.07, maxActiveFruits: 4, bombChance: 0.08 },
  { target: 23, spawnDelay: 710, fruitSpeed: 1.24, gravityScale: 1.08, maxActiveFruits: 4, bombChance: 0.09 },
  { target: 25, spawnDelay: 680, fruitSpeed: 1.26, gravityScale: 1.09, maxActiveFruits: 4, bombChance: 0.1 },
];

export const LEVELS = LEVEL_DIFFICULTY.map((config, index) => ({
  level: index + 1,
  ...config,
}));

export const MAX_LEVEL = LEVELS.length;

export function getLevelConfig(level) {
  const config = LEVELS[Math.min(Math.max(level, 1), MAX_LEVEL) - 1];

  return { ...config };
}
