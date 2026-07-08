export const LEVELS = [
  10, 14, 18, 22, 26, 30, 35, 40, 46, 52, 58, 64, 72, 82, 95,
].map((target, index) => {
  const level = index + 1;

  return {
    level,
    target,
    spawnDelay: Math.max(330, 1000 - index * 44),
    fruitSpeed: 1 + index * 0.055,
    bombChance: Math.min(0.28, 0.08 + index * 0.012),
  };
});

export const MAX_LEVEL = LEVELS.length;

const DIFFICULTY_SETTINGS = {
  easy: {
    spawnDelay: 1.18,
    fruitSpeed: 0.86,
    bombChance: 0.68,
  },
  normal: {
    spawnDelay: 1,
    fruitSpeed: 1,
    bombChance: 1,
  },
  hard: {
    spawnDelay: 0.9,
    fruitSpeed: 1.1,
    bombChance: 1.14,
  },
};

export function getLevelConfig(level, difficulty = 'normal') {
  const config = LEVELS[Math.min(Math.max(level, 1), MAX_LEVEL) - 1];
  const difficultySettings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.normal;

  return {
    ...config,
    spawnDelay: Math.max(280, Math.round(config.spawnDelay * difficultySettings.spawnDelay)),
    fruitSpeed: config.fruitSpeed * difficultySettings.fruitSpeed,
    bombChance: Math.min(0.3, config.bombChance * difficultySettings.bombChance),
  };
}
