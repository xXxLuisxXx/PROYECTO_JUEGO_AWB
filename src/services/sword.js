export const WEAPON_LOADOUTS = {
  lightning: {
    id: 'lightning',
    label: 'Rayo electrico',
    spriteUrl: null,
    screenWidthRatio: 0.12,
    minWidth: 86,
    maxWidth: 180,
    aspectRatio: 5.2,
    drawOffset: 0.5,
    trailLength: 18,
    smoothing: 0.92,
    power: 1.08,
  },
};

export const ENERGY_THEMES = {
  storm: {
    id: 'storm',
    label: 'Rayo azul',
    color: '#20d7ff',
    core: '#ffffff',
    dark: '#145cff',
  },
};

export const SWORD_CONFIG = WEAPON_LOADOUTS.lightning;

export function getWeaponLoadout(id = 'lightning') {
  return WEAPON_LOADOUTS[id] || WEAPON_LOADOUTS.lightning;
}

export function getEnergyTheme(id = 'storm') {
  return ENERGY_THEMES[id] || ENERGY_THEMES.storm;
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
    speed: 0,
    hasPoint: false,
  };
}

export function updateSword(sword, rawPoint, width, height, weapon = SWORD_CONFIG) {
  if (!rawPoint) {
    sword.hasPoint = false;
    sword.speed *= 0.82;
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
    sword.speed = 0;
    sword.hasPoint = true;
    return sword;
  }

  sword.previousTipX = sword.tipX;
  sword.previousTipY = sword.tipY;

  const dx = targetX - sword.x;
  const dy = targetY - sword.y;
  sword.x += dx * weapon.smoothing;
  sword.y += dy * weapon.smoothing;
  sword.speed = Math.hypot(sword.x - sword.previousTipX, sword.y - sword.previousTipY);

  if (Math.hypot(dx, dy) > 0.8) {
    sword.angle = Math.atan2(dy, dx);
  }

  sword.tipX = sword.x;
  sword.tipY = sword.y;
  return sword;
}

export function drawSword(ctx, sword, image, width, weapon = SWORD_CONFIG, energy = ENERGY_THEMES.storm) {
  if (!sword.hasPoint) {
    return;
  }

  const pulse = Math.min(1, sword.speed / Math.max(26, width * 0.03));
  const radius = 6 + pulse * 9;

  ctx.save();
  ctx.translate(sword.x, sword.y);
  ctx.shadowColor = energy.color;
  ctx.shadowBlur = 26 + pulse * 22;

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 3.4);
  glow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  glow.addColorStop(0.28, 'rgba(32, 215, 255, 0.78)');
  glow.addColorStop(1, 'rgba(20, 92, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 3.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = energy.core;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
