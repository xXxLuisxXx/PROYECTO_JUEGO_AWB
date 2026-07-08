export const LEVELS = [
  10, 13, 16, 20, 24, 29, 34, 40, 47, 55,
].map((target, index) => {
  const level = index + 1;

  return {
    level,
    target,
    spawnDelay: Math.max(500, 980 - index * 52),
    fruitSpeed: 1 + index * 0.06,
    bombChance: Math.min(0.2, 0.07 + index * 0.01),
  };
});

export const MAX_LEVEL = LEVELS.length;

export function getLevelConfig(level) {
  const config = LEVELS[Math.min(Math.max(level, 1), MAX_LEVEL) - 1];

  return { ...config };
}
