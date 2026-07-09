export const LEVELS = [
  10, 13, 16, 20, 24, 29, 34, 40, 47, 55,
].map((target, index) => {
  const level = index + 1;

  return {
    level,
    target,
    spawnDelay: Math.max(360, 900 - index * 58),
    fruitSpeed: 1 + index * 0.085,
    gravityScale: 1 + index * 0.025,
    maxActiveFruits: Math.min(8, 3 + Math.floor(index / 2)),
    bombChance: Math.min(0.28, 0.05 + index * 0.018),
  };
});

export const MAX_LEVEL = LEVELS.length;

export function getLevelConfig(level) {
  const config = LEVELS[Math.min(Math.max(level, 1), MAX_LEVEL) - 1];

  return { ...config };
}
