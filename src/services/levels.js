export const LEVELS = [
  10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120,
  128, 136, 145, 154, 164, 174, 185, 196, 208, 220, 232, 244, 256, 268, 280,
].map((target, index) => {
  const level = index + 1;
  const extraDifficulty = Math.max(0, level - 15);

  return {
    level,
    target,
    spawnDelay: Math.max(300, 1000 - index * 26 - extraDifficulty * 7),
    fruitSpeed: 1 + index * 0.034 + extraDifficulty * 0.022,
    bombChance: Math.min(0.26, 0.08 + index * 0.0045 + extraDifficulty * 0.0035),
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
