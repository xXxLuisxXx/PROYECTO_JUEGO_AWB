export const WEAPON_LOADOUTS = {
  axe: {
    id: 'axe',
    label: 'Hacha solar',
    spriteUrl: '/assets/axe.svg',
    screenWidthRatio: 0.16,
    minWidth: 118,
    maxWidth: 220,
    aspectRatio: 2.67,
    drawOffset: 0.72,
    trailLength: 9,
    smoothing: 0.68,
    power: 1.15,
  },
  sword: {
    id: 'sword',
    label: 'Espada ninja',
    spriteUrl: '/assets/sword.svg',
    screenWidthRatio: 0.18,
    minWidth: 130,
    maxWidth: 260,
    aspectRatio: 4,
    drawOffset: 0.86,
    trailLength: 11,
    smoothing: 0.7,
    power: 1,
  },
  plasma: {
    id: 'plasma',
    label: 'Filo de plasma',
    spriteUrl: null,
    screenWidthRatio: 0.17,
    minWidth: 128,
    maxWidth: 240,
    aspectRatio: 4.8,
    drawOffset: 0.78,
    trailLength: 14,
    smoothing: 0.72,
    power: 1.25,
  },
};

export const ENERGY_THEMES = {
  frost: {
    id: 'frost',
    label: 'Orbe glacial',
    color: '#79f2ff',
    core: '#ffffff',
    dark: '#1f8fe8',
  },
  jungle: {
    id: 'jungle',
    label: 'Aura selva',
    color: '#8bff75',
    core: '#f2ffe5',
    dark: '#20b85d',
  },
  ember: {
    id: 'ember',
    label: 'Fuego mango',
    color: '#ffdc5f',
    core: '#fff8d8',
    dark: '#ff6b57',
  },
  berry: {
    id: 'berry',
    label: 'Pulso mora',
    color: '#caa6ff',
    core: '#ffffff',
    dark: '#8d63f7',
  },
};

export const SWORD_CONFIG = WEAPON_LOADOUTS.axe;

export function getWeaponLoadout(id = 'axe') {
  return WEAPON_LOADOUTS[id] || WEAPON_LOADOUTS.axe;
}

export function getEnergyTheme(id = 'frost') {
  return ENERGY_THEMES[id] || ENERGY_THEMES.frost;
}

export function createSwordState() {
  return {
    x: 0,
    y: 0,
    previousTipX: 0,
    previousTipY: 0,
    tipX: 0,
    tipY: 0,
    angle: 0,
    hasPoint: false,
  };
}

export function getSwordSize(width, weapon = SWORD_CONFIG) {
  return Math.max(
    weapon.minWidth,
    Math.min(weapon.maxWidth, width * weapon.screenWidthRatio),
  );
}

export function updateSword(sword, rawPoint, width, height, weapon = SWORD_CONFIG) {
  if (!rawPoint) {
    sword.hasPoint = false;
    return sword;
  }

  const targetX = rawPoint.x * width;
  const targetY = rawPoint.y * height;

  if (!sword.hasPoint) {
    sword.x = targetX;
    sword.y = targetY;
    sword.tipX = targetX;
    sword.tipY = targetY;
    sword.previousTipX = targetX;
    sword.previousTipY = targetY;
    sword.hasPoint = true;
    return sword;
  }

  sword.previousTipX = sword.tipX;
  sword.previousTipY = sword.tipY;

  const dx = targetX - sword.x;
  const dy = targetY - sword.y;
  sword.x += dx * weapon.smoothing;
  sword.y += dy * weapon.smoothing;

  if (Math.hypot(dx, dy) > 1.2) {
    sword.angle = Math.atan2(dy, dx);
  }

  sword.tipX = sword.x;
  sword.tipY = sword.y;
  return sword;
}

export function drawSword(ctx, sword, image, width, weapon = SWORD_CONFIG, energy = ENERGY_THEMES.frost) {
  if (!sword.hasPoint) {
    return;
  }

  const swordWidth = getSwordSize(width, weapon);
  const swordHeight = swordWidth / weapon.aspectRatio;

  ctx.save();
  ctx.translate(sword.x, sword.y);
  ctx.rotate(sword.angle);
  ctx.shadowColor = energy.color;
  ctx.shadowBlur = 18;

  if (image?.complete) {
    ctx.drawImage(image, -swordWidth * weapon.drawOffset, -swordHeight / 2, swordWidth, swordHeight);
  } else {
    const gradient = ctx.createLinearGradient(-swordWidth * weapon.drawOffset, 0, swordWidth * 0.22, 0);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.34, energy.dark);
    gradient.addColorStop(0.72, energy.color);
    gradient.addColorStop(1, energy.core);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(-swordWidth * weapon.drawOffset, -swordHeight * 0.22, swordWidth, swordHeight * 0.44, swordHeight * 0.22);
    ctx.fill();
    ctx.fillStyle = energy.core;
    ctx.beginPath();
    ctx.arc(swordWidth * 0.2, 0, swordHeight * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
