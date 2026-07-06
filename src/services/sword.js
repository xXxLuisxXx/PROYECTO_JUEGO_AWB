export const SWORD_CONFIG = {
  spriteUrl: '/assets/sword.svg',
  screenWidthRatio: 0.18,
  minWidth: 130,
  maxWidth: 260,
  aspectRatio: 4,
  tipOffset: 0.46,
  trailLength: 9,
  smoothing: 0.34,
};

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

export function getSwordSize(width) {
  return Math.max(
    SWORD_CONFIG.minWidth,
    Math.min(SWORD_CONFIG.maxWidth, width * SWORD_CONFIG.screenWidthRatio),
  );
}

export function updateSword(sword, rawPoint, width, height) {
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
  sword.x += dx * SWORD_CONFIG.smoothing;
  sword.y += dy * SWORD_CONFIG.smoothing;

  if (Math.hypot(dx, dy) > 1.2) {
    sword.angle = Math.atan2(dy, dx);
  }

  sword.tipX = sword.x;
  sword.tipY = sword.y;
  return sword;
}

export function drawSword(ctx, sword, image, width) {
  if (!sword.hasPoint) {
    return;
  }

  const swordWidth = getSwordSize(width);
  const swordHeight = swordWidth / SWORD_CONFIG.aspectRatio;

  ctx.save();
  ctx.translate(sword.x, sword.y);
  ctx.rotate(sword.angle);
  ctx.shadowColor = '#79f2ff';
  ctx.shadowBlur = 16;

  if (image?.complete) {
    ctx.drawImage(image, -swordWidth * 0.86, -swordHeight / 2, swordWidth, swordHeight);
  } else {
    ctx.fillStyle = '#9ff7ff';
    ctx.fillRect(-swordWidth * 0.86, -3, swordWidth, 6);
  }

  ctx.restore();
}
