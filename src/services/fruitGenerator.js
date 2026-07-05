export const FRUIT_TYPES = {
  apple: {
    label: 'Manzana',
    points: 10,
    color: '#ff3b4f',
    flesh: '#ffe9de',
    splash: '#ff5365',
    emoji: 'A',
  },
  orange: {
    label: 'Naranja',
    points: 10,
    color: '#ff8a2a',
    flesh: '#ffd38a',
    splash: '#ff9a36',
    emoji: 'N',
  },
  lemon: {
    label: 'Limon',
    points: 10,
    color: '#f8e64f',
    flesh: '#fff6a0',
    splash: '#fff15d',
    emoji: 'L',
  },
  strawberry: {
    label: 'Fresa',
    points: 15,
    color: '#ff335a',
    flesh: '#ffd6df',
    splash: '#ff4a68',
    emoji: 'F',
  },
  grape: {
    label: 'Uva',
    points: 15,
    color: '#8f6cff',
    flesh: '#d8c8ff',
    splash: '#a783ff',
    emoji: 'U',
  },
  mango: {
    label: 'Mango',
    points: 15,
    color: '#ffae35',
    flesh: '#ffe08b',
    splash: '#ffc247',
    emoji: 'M',
  },
  pear: {
    label: 'Pera',
    points: 10,
    color: '#9be564',
    flesh: '#e9ffd0',
    splash: '#b9f27b',
    emoji: 'P',
  },
  coconut: {
    label: 'Coco',
    points: 20,
    color: '#7b5030',
    flesh: '#fff4dd',
    splash: '#e2c39c',
    emoji: 'C',
  },
  banana: {
    label: 'Banano',
    points: 10,
    color: '#ffd44d',
    flesh: '#fff2a8',
    splash: '#ffd95e',
    emoji: 'B',
  },
  watermelon: {
    label: 'Sandia',
    points: 15,
    color: '#25c76f',
    flesh: '#ff3157',
    splash: '#ff3157',
    emoji: 'S',
  },
  pineapple: {
    label: 'Pina',
    points: 20,
    color: '#ffb22e',
    flesh: '#ffe171',
    splash: '#ffc340',
    emoji: 'P',
  },
};

const TYPES = Object.keys(FRUIT_TYPES);

export function createFruit(width, height, levelConfig) {
  const speed = levelConfig?.fruitSpeed ?? 1;
  const isBomb = Math.random() < (levelConfig?.bombChance ?? 0.16);
  const radius = isBomb ? 36 : 38 + Math.random() * 18;
  const edgePadding = radius + 24;
  const x = edgePadding + Math.random() * Math.max(10, width - edgePadding * 2);
  const velocityX = (Math.random() - 0.5) * 3.8 * speed;
  const velocityY = -(11 + Math.random() * 5.5) * speed;

  if (isBomb) {
    return {
      id: crypto.randomUUID(),
      x,
      y: height + radius,
      radius,
      velocityX,
      velocityY,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.16,
      type: 'bomb',
      sliced: false,
    };
  }

  const type = TYPES[Math.floor(Math.random() * TYPES.length)];
  return {
    id: crypto.randomUUID(),
    x,
    y: height + radius,
    radius,
    velocityX,
    velocityY,
    rotation: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 0.18,
    type,
    sliced: false,
  };
}

export function shouldSpawnFruit(lastSpawnTime, now, levelConfig) {
  const baseDelay = levelConfig?.spawnDelay ?? 850;
  return now - lastSpawnTime > baseDelay + Math.random() * 90;
}
