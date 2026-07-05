export const LEVELS = [
  10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120,
].map((target, index) => {
  const level = index + 1;

  return {
    level,
    target,
    spawnDelay: Math.max(330, 980 - index * 43),
    fruitSpeed: 1 + index * 0.055,
    bombChance: Math.min(0.24, 0.1 + index * 0.008),
  };
});

export const MAX_LEVEL = LEVELS.length;

export function getLevelConfig(level) {
  return LEVELS[Math.min(Math.max(level, 1), MAX_LEVEL) - 1];
}
