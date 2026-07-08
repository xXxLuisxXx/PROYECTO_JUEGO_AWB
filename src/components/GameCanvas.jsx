import { useCallback, useEffect, useRef } from 'react';
import { segmentIntersectsCircle } from '../services/collision.js';
import { playSound } from '../services/audio.js';
import { createFruit, FRUIT_TYPES, shouldSpawnFruit } from '../services/fruitGenerator.js';
import { getLevelConfig, MAX_LEVEL } from '../services/levels.js';
import {
  createSwordState,
  drawSword,
  getEnergyTheme,
  getWeaponLoadout,
  updateSword,
} from '../services/sword.js';

const GRAVITY = 0.22;
const MAX_PARTICLES = 80;
const MAX_HALVES = 32;
const MAX_IMPACT_RINGS = 14;
const MAX_FLOATING_TEXTS = 12;
const MAX_SPRITE_CACHE_SIZE = 96;
const COMBO_WINDOW_MS = 1000;
const fruitSpriteCache = new Map();

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 1.2);
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width: rect.width, height: rect.height };
}

function createParticles(x, y, color, amount = 14, explosive = false) {
  return Array.from({ length: amount }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = explosive ? 3 + Math.random() * 5 : 1.5 + Math.random() * 3;

    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.026 + Math.random() * 0.026,
      size: explosive ? 3 + Math.random() * 5 : 2 + Math.random() * 4,
      color,
      explosive,
    };
  });
}

function createCutSlash(start, end) {
  return {
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
    life: 1,
    width: 7,
  };
}

function createImpactRing(x, y, color, explosive = false) {
  return {
    x,
    y,
    color,
    radius: explosive ? 24 : 14,
    speed: explosive ? 9 : 5.8,
    width: explosive ? 8 : 5,
    life: 1,
    decay: explosive ? 0.048 : 0.06,
  };
}

function createFloatingText(x, y, text, color = '#ffffff') {
  return {
    x,
    y,
    text,
    color,
    vy: -1.45,
    life: 1,
  };
}

function createHalves(fruit) {
  const type = FRUIT_TYPES[fruit.type];
  return [
    {
      ...fruit,
      half: 'left',
      vx: fruit.velocityX - 3.4,
      vy: fruit.velocityY * 0.28 - 1,
      life: 1,
      color: type.color,
      flesh: type.flesh,
    },
    {
      ...fruit,
      half: 'right',
      vx: fruit.velocityX + 3.4,
      vy: fruit.velocityY * 0.28 - 1,
      life: 1,
      color: type.color,
      flesh: type.flesh,
    },
  ];
}

function fillLeaf(ctx, x, y, size, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#35b85d';
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.72, size * 0.34, -0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStem(ctx, x, y, height, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = '#6b3f1e';
  ctx.lineWidth = Math.max(3, height * 0.16);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -height);
  ctx.stroke();
  ctx.restore();
}

function drawSeeds(ctx, positions, size, color = '#16120c') {
  ctx.fillStyle = color;
  positions.forEach(([x, y, angle = 0]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.44, size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawApple(ctx, r) {
  const gradient = ctx.createRadialGradient(-r * 0.28, -r * 0.32, r * 0.12, 0, 0, r);
  gradient.addColorStop(0, '#ff7a78');
  gradient.addColorStop(0.5, '#f32942');
  gradient.addColorStop(1, '#b91227');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.82);
  ctx.bezierCurveTo(-r * 0.56, -r * 1.06, -r * 1.1, -r * 0.36, -r * 0.86, r * 0.28);
  ctx.bezierCurveTo(-r * 0.62, r * 0.98, -r * 0.08, r * 1.08, 0, r * 0.88);
  ctx.bezierCurveTo(r * 0.08, r * 1.08, r * 0.62, r * 0.98, r * 0.86, r * 0.28);
  ctx.bezierCurveTo(r * 1.1, -r * 0.36, r * 0.56, -r * 1.06, 0, -r * 0.82);
  ctx.fill();
  drawStem(ctx, r * 0.08, -r * 0.72, r * 0.42, -0.2);
  fillLeaf(ctx, r * 0.34, -r * 0.95, r * 0.34, -0.35);
}

function drawOrange(ctx, r) {
  const gradient = ctx.createRadialGradient(-r * 0.3, -r * 0.28, r * 0.12, 0, 0, r);
  gradient.addColorStop(0, '#ffd18a');
  gradient.addColorStop(0.45, '#ff8b2d');
  gradient.addColorStop(1, '#dc5f10');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 237, 180, 0.32)';
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.arc(i * r * 0.18, 0, r * (0.48 + Math.abs(i) * 0.07), -1.2, 1.2);
    ctx.stroke();
  }
}

function drawLemon(ctx, r) {
  const gradient = ctx.createLinearGradient(-r, -r, r, r);
  gradient.addColorStop(0, '#fff8a8');
  gradient.addColorStop(0.55, '#f6df33');
  gradient.addColorStop(1, '#d0ae13');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.02, r * 0.62, -0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 210, 0.36)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.22, r * 0.34, r * 0.12, -0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawStrawberry(ctx, r) {
  const gradient = ctx.createRadialGradient(-r * 0.24, -r * 0.34, r * 0.12, 0, 0, r);
  gradient.addColorStop(0, '#ff7890');
  gradient.addColorStop(0.58, '#ef274f');
  gradient.addColorStop(1, '#a40c2c');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, r * 0.95);
  ctx.bezierCurveTo(-r * 1.02, r * 0.24, -r * 0.72, -r * 0.92, 0, -r * 0.62);
  ctx.bezierCurveTo(r * 0.72, -r * 0.92, r * 1.02, r * 0.24, 0, r * 0.95);
  ctx.fill();
  fillLeaf(ctx, -r * 0.28, -r * 0.72, r * 0.3, 0.35);
  fillLeaf(ctx, 0, -r * 0.78, r * 0.32, Math.PI / 2);
  fillLeaf(ctx, r * 0.28, -r * 0.72, r * 0.3, -0.35);
  drawSeeds(ctx, [
    [-r * 0.34, -r * 0.18, -0.2], [0, -r * 0.24, 0], [r * 0.34, -r * 0.18, 0.2],
    [-r * 0.22, r * 0.18, -0.1], [r * 0.22, r * 0.18, 0.1], [0, r * 0.48, 0],
  ], r * 0.06, '#ffd778');
}

function drawGrape(ctx, r) {
  const grapes = [
    [-0.34, -0.36], [0.08, -0.4], [0.42, -0.2],
    [-0.48, 0.02], [-0.08, 0.02], [0.3, 0.18],
    [-0.24, 0.42], [0.14, 0.5],
  ];
  grapes.forEach(([x, y], index) => {
    const gradient = ctx.createRadialGradient(r * x - r * 0.08, r * y - r * 0.08, r * 0.04, r * x, r * y, r * 0.35);
    gradient.addColorStop(0, '#cab8ff');
    gradient.addColorStop(0.45, '#8d63f7');
    gradient.addColorStop(1, '#4d2aa6');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(r * x, r * y, r * (index < 2 ? 0.32 : 0.34), 0, Math.PI * 2);
    ctx.fill();
  });
  drawStem(ctx, -r * 0.05, -r * 0.58, r * 0.35, 0.4);
  fillLeaf(ctx, r * 0.26, -r * 0.78, r * 0.28, -0.25);
}

function drawMango(ctx, r) {
  const gradient = ctx.createLinearGradient(-r, -r, r, r);
  gradient.addColorStop(0, '#ffcf4c');
  gradient.addColorStop(0.5, '#ff8f2f');
  gradient.addColorStop(1, '#ef3e42');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.78, r * 1.02, 0.58, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 244, 170, 0.28)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.24, -r * 0.22, r * 0.24, r * 0.46, 0.55, 0, Math.PI * 2);
  ctx.fill();
}

function drawPear(ctx, r) {
  const gradient = ctx.createRadialGradient(-r * 0.2, -r * 0.24, r * 0.12, 0, 0, r);
  gradient.addColorStop(0, '#d7ff92');
  gradient.addColorStop(0.52, '#95d84f');
  gradient.addColorStop(1, '#4f9f2c');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.98);
  ctx.bezierCurveTo(-r * 0.42, -r * 0.92, -r * 0.46, -r * 0.38, -r * 0.8, -r * 0.02);
  ctx.bezierCurveTo(-r * 1.2, r * 0.46, -r * 0.68, r * 1.06, 0, r * 1.0);
  ctx.bezierCurveTo(r * 0.68, r * 1.06, r * 1.2, r * 0.46, r * 0.8, -r * 0.02);
  ctx.bezierCurveTo(r * 0.46, -r * 0.38, r * 0.42, -r * 0.92, 0, -r * 0.98);
  ctx.fill();
  drawStem(ctx, r * 0.06, -r * 0.86, r * 0.36, -0.15);
  fillLeaf(ctx, r * 0.3, -r * 1.02, r * 0.28, -0.28);
}

function drawCoconut(ctx, r) {
  const gradient = ctx.createRadialGradient(-r * 0.28, -r * 0.3, r * 0.12, 0, 0, r);
  gradient.addColorStop(0, '#b98155');
  gradient.addColorStop(0.55, '#704626');
  gradient.addColorStop(1, '#321c10');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.98, r * 0.84, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 231, 194, 0.22)';
  ctx.lineWidth = 2;
  [-0.32, 0, 0.32].forEach((x) => {
    ctx.beginPath();
    ctx.arc(r * x, -r * 0.2, r * 0.08, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.fillStyle = 'rgba(255, 244, 221, 0.22)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.22, -r * 0.18, r * 0.24, r * 0.12, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawBanana(ctx, r) {
  ctx.fillStyle = '#ffd84f';
  ctx.beginPath();
  ctx.moveTo(-r * 0.96, -r * 0.08);
  ctx.bezierCurveTo(-r * 0.54, r * 0.82, r * 0.58, r * 0.74, r * 0.98, -r * 0.2);
  ctx.bezierCurveTo(r * 0.46, r * 0.28, -r * 0.3, r * 0.22, -r * 0.72, -r * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#b98216';
  ctx.lineWidth = Math.max(3, r * 0.08);
  ctx.stroke();
  ctx.fillStyle = '#6b3f1e';
  ctx.beginPath();
  ctx.arc(-r * 0.9, -r * 0.15, r * 0.12, 0, Math.PI * 2);
  ctx.arc(r * 0.96, -r * 0.2, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawWatermelon(ctx, r) {
  ctx.fillStyle = '#1f9b4f';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.08, r * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d7ffbe';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.92, r * 0.68, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff3157';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.78, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  drawSeeds(ctx, [
    [-r * 0.34, -r * 0.08, -0.2], [0, -r * 0.16, 0], [r * 0.34, -r * 0.08, 0.2],
    [-r * 0.18, r * 0.18, -0.15], [r * 0.18, r * 0.18, 0.15],
  ], r * 0.08);
  ctx.strokeStyle = 'rgba(9, 72, 35, 0.55)';
  ctx.lineWidth = 3;
  [-0.55, 0, 0.55].forEach((x) => {
    ctx.beginPath();
    ctx.arc(r * x, 0, r * 0.6, -1.1, 1.1);
    ctx.stroke();
  });
}

function drawPineapple(ctx, r) {
  ctx.fillStyle = '#2fbd5b';
  [-0.38, -0.12, 0.12, 0.38].forEach((x, index) => {
    ctx.save();
    ctx.translate(r * x, -r * 1.02);
    ctx.rotate((index - 1.5) * 0.35);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-r * 0.2, r * 0.52);
    ctx.lineTo(r * 0.2, r * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
  const gradient = ctx.createLinearGradient(0, -r, 0, r);
  gradient.addColorStop(0, '#ffd75c');
  gradient.addColorStop(1, '#d47a12');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(-r * 0.68, -r * 0.72, r * 1.36, r * 1.48, r * 0.28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(112, 66, 12, 0.52)';
  ctx.lineWidth = 2;
  for (let i = -3; i <= 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.76, i * r * 0.24);
    ctx.lineTo(r * 0.76, i * r * 0.24 + r * 0.44);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.76, i * r * 0.24);
    ctx.lineTo(-r * 0.76, i * r * 0.24 + r * 0.44);
    ctx.stroke();
  }
}

const FRUIT_DRAWERS = {
  apple: drawApple,
  orange: drawOrange,
  lemon: drawLemon,
  strawberry: drawStrawberry,
  grape: drawGrape,
  mango: drawMango,
  pear: drawPear,
  coconut: drawCoconut,
  banana: drawBanana,
  watermelon: drawWatermelon,
  pineapple: drawPineapple,
};

function trimSpriteCache() {
  if (fruitSpriteCache.size <= MAX_SPRITE_CACHE_SIZE) {
    return;
  }

  const oldestKey = fruitSpriteCache.keys().next().value;
  fruitSpriteCache.delete(oldestKey);
}

function createFruitSprite(type, radius) {
  const padding = Math.ceil(radius * (type === 'bomb' ? 1.2 : 0.55));
  const size = Math.ceil(radius * (type === 'bomb' ? 3.2 : 2.35) + padding * 2);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { alpha: true });
  const center = size / 2;

  ctx.save();
  ctx.translate(center, center);

  if (type === 'bomb') {
    drawBomb(ctx, {
      x: 0,
      y: 0,
      radius,
      rotation: 0,
    });
  } else {
    const config = FRUIT_TYPES[type];
    ctx.shadowColor = config.splash;
    ctx.shadowBlur = 12;
    FRUIT_DRAWERS[type]?.(ctx, radius);
  }

  ctx.restore();
  return { canvas, size };
}

function getFruitSprite(type, radius) {
  const radiusKey = Math.round(radius);
  const key = `${type}-${radiusKey}`;
  const cached = fruitSpriteCache.get(key);

  if (cached) {
    return cached;
  }

  const sprite = createFruitSprite(type, radiusKey);
  fruitSpriteCache.set(key, sprite);
  trimSpriteCache();
  return sprite;
}

function drawFruit(ctx, fruit) {
  const sprite = getFruitSprite(fruit.type, fruit.radius);
  ctx.save();
  ctx.translate(fruit.x, fruit.y);
  ctx.rotate(fruit.rotation);
  ctx.drawImage(sprite.canvas, -sprite.size / 2, -sprite.size / 2, sprite.size, sprite.size);
  ctx.restore();
}

function drawBomb(ctx, bomb) {
  const r = bomb.radius;

  ctx.save();
  ctx.translate(bomb.x, bomb.y);
  ctx.rotate(bomb.rotation);

  ctx.shadowColor = '#ff6b2f';
  ctx.shadowBlur = 18;
  const bodyGradient = ctx.createRadialGradient(-r * 0.34, -r * 0.36, r * 0.12, 0, 0, r);
  bodyGradient.addColorStop(0, '#5a6575');
  bodyGradient.addColorStop(0.38, '#202733');
  bodyGradient.addColorStop(1, '#080b10');
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.arc(0, r * 0.08, r * 0.92, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#05070a';
  ctx.lineWidth = Math.max(3, r * 0.08);
  ctx.beginPath();
  ctx.arc(0, r * 0.08, r * 0.92, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.28, r * 0.18, r * 0.1, -0.65, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4a2c16';
  ctx.strokeStyle = '#2a160a';
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.beginPath();
  ctx.roundRect(-r * 0.2, -r * 0.98, r * 0.4, r * 0.28, r * 0.08);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#2f2115';
  ctx.lineWidth = Math.max(4, r * 0.1);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.96);
  ctx.bezierCurveTo(r * 0.1, -r * 1.2, r * 0.36, -r * 1.16, r * 0.48, -r * 1.38);
  ctx.stroke();

  ctx.shadowColor = '#ffdc5f';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#ffdc5f';
  ctx.beginPath();
  ctx.moveTo(r * 0.48, -r * 1.52);
  ctx.lineTo(r * 0.58, -r * 1.34);
  ctx.lineTo(r * 0.78, -r * 1.32);
  ctx.lineTo(r * 0.62, -r * 1.2);
  ctx.lineTo(r * 0.66, -r * 1.02);
  ctx.lineTo(r * 0.48, -r * 1.12);
  ctx.lineTo(r * 0.3, -r * 1.02);
  ctx.lineTo(r * 0.36, -r * 1.22);
  ctx.lineTo(r * 0.2, -r * 1.34);
  ctx.lineTo(r * 0.4, -r * 1.36);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ff6b2f';
  ctx.beginPath();
  ctx.arc(r * 0.5, -r * 1.29, r * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHalf(ctx, half) {
  ctx.save();
  ctx.globalAlpha = half.life;
  ctx.translate(half.x, half.y);
  ctx.rotate(half.rotation);
  ctx.fillStyle = half.flesh;
  ctx.strokeStyle = half.color;
  ctx.lineWidth = 7;
  ctx.beginPath();

  if (half.half === 'left') {
    ctx.arc(0, 0, half.radius, Math.PI / 2, (Math.PI * 3) / 2);
  } else {
    ctx.arc(0, 0, half.radius, -Math.PI / 2, Math.PI / 2);
  }

  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawTrail(ctx, trail, energy) {
  for (let i = 1; i < trail.length; i += 1) {
    const previous = trail[i - 1];
    const point = trail[i];
    const alpha = point.life * (i / trail.length);
    ctx.strokeStyle = `${energy.color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
    ctx.lineWidth = 5 + i * 0.42;
    ctx.lineCap = 'round';
    ctx.shadowColor = energy.color;
    ctx.shadowBlur = 11;
    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

function drawParticles(ctx, particles) {
  particles.forEach((particle) => {
    ctx.globalAlpha = particle.life;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawSlashes(ctx, slashes) {
  slashes.forEach((slash) => {
    ctx.globalAlpha = slash.life;
    const gradient = ctx.createLinearGradient(slash.x1, slash.y1, slash.x2, slash.y2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.45, '#ffffff');
    gradient.addColorStop(1, '#ffdc5f');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = slash.width * slash.life;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#ffdc5f';
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.moveTo(slash.x1, slash.y1);
    ctx.lineTo(slash.x2, slash.y2);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawImpactRings(ctx, rings) {
  rings.forEach((ring) => {
    ctx.globalAlpha = ring.life;
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = Math.max(1, ring.width * ring.life);
    ctx.shadowColor = ring.color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawFloatingTexts(ctx, texts) {
  texts.forEach((text) => {
    ctx.save();
    ctx.globalAlpha = text.life;
    ctx.translate(text.x, text.y);
    ctx.scale(1 + (1 - text.life) * 0.24, 1 + (1 - text.life) * 0.24);
    ctx.textAlign = 'center';
    ctx.font = '900 24px Inter, system-ui';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.strokeText(text.text, 0, 0);
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, 0, 0);
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}

export default function GameCanvas({
  inputPointRef,
  inputMode,
  isInputReady,
  inputStatus,
  startLevel = 1,
  difficulty = 'normal',
  weaponSkin = 'axe',
  energyTheme = 'frost',
  paused,
  onScore,
  onLoseLife,
  onGameOver,
  onLevelStats,
  onVictory,
  onRecoverLife,
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(0);
  const sizeRef = useRef({ width: 0, height: 0 });
  const fruitsRef = useRef([]);
  const halvesRef = useRef([]);
  const particlesRef = useRef([]);
  const trailRef = useRef([]);
  const slashesRef = useRef([]);
  const impactRingsRef = useRef([]);
  const floatingTextsRef = useRef([]);
  const mousePointRef = useRef(null);
  const swordRef = useRef(createSwordState());
  const swordImageRef = useRef(null);
  const weaponRef = useRef(getWeaponLoadout(weaponSkin));
  const energyRef = useRef(getEnergyTheme(energyTheme));
  const inputReadyRef = useRef(isInputReady);
  const inputModeRef = useRef(inputMode);
  const pausedRef = useRef(paused);
  const lastSpawnRef = useRef(0);
  const lastSliceTimeRef = useRef(0);
  const comboRef = useRef(0);
  const shakeRef = useRef(0);
  const scoreRef = useRef(0);
  const lostLivesRef = useRef(0);
  const levelRef = useRef(startLevel);
  const levelFruitCountRef = useRef(0);
  const totalFruitCountRef = useRef(0);
  const levelMessageRef = useRef(null);
  const fpsRef = useRef({ frames: 0, lastTime: performance.now(), value: 0 });
  const callbacksRef = useRef({ onScore, onLoseLife, onGameOver, onLevelStats, onVictory, onRecoverLife });

  useEffect(() => {
    callbacksRef.current = { onScore, onLoseLife, onGameOver, onLevelStats, onVictory, onRecoverLife };
  }, [onGameOver, onLevelStats, onLoseLife, onScore, onVictory, onRecoverLife]);

  useEffect(() => {
    inputReadyRef.current = isInputReady;
  }, [isInputReady]);

  useEffect(() => {
    inputModeRef.current = inputMode;
    if (inputMode !== 'mouse') {
      mousePointRef.current = null;
    }
  }, [inputMode]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const weapon = getWeaponLoadout(weaponSkin);
    const energy = getEnergyTheme(energyTheme);
    weaponRef.current = weapon;
    energyRef.current = energy;
    const image = new Image();
    if (weapon.spriteUrl) {
      image.src = weapon.spriteUrl;
      swordImageRef.current = image;
    } else {
      swordImageRef.current = null;
    }
  }, [energyTheme, weaponSkin]);

  const handleResize = useCallback(() => {
    if (canvasRef.current) {
      sizeRef.current = resizeCanvas(canvasRef.current);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    let lastTime = performance.now();
    let stopped = false;
    levelRef.current = startLevel;

    handleResize();
    window.addEventListener('resize', handleResize);
    const initialLevelConfig = getLevelConfig(startLevel, difficulty);
    callbacksRef.current.onLevelStats({
      level: startLevel,
      target: initialLevelConfig.target,
      fruits: 0,
      totalFruits: 0,
      fps: 0,
    });

    function updateFps(now) {
      const fps = fpsRef.current;
      fps.frames += 1;
      if (now - fps.lastTime >= 500) {
        fps.value = Math.round((fps.frames * 1000) / (now - fps.lastTime));
        fps.frames = 0;
        fps.lastTime = now;
        return true;
      }
      return false;
    }

    function publishStats() {
      const levelConfig = getLevelConfig(levelRef.current, difficulty);
      callbacksRef.current.onLevelStats({
        level: levelRef.current,
        target: levelConfig.target,
        fruits: levelFruitCountRef.current,
        totalFruits: totalFruitCountRef.current,
        fps: fpsRef.current.value,
      });
    }

    function completeLevel() {
      if (levelRef.current >= MAX_LEVEL) {
        playSound('gameover');
        callbacksRef.current.onVictory({
          score: scoreRef.current,
          totalFruits: totalFruitCountRef.current,
        });
        stopped = true;
        return;
      }
      if (callbacksRef.current && typeof callbacksRef.current.onRecoverLife === 'function') {
    callbacksRef.current.onRecoverLife();
  }

      levelRef.current += 1;
      levelFruitCountRef.current = 0;
      fruitsRef.current = [];
      levelMessageRef.current = {
        text: 'Nivel Completado',
        level: levelRef.current,
        until: performance.now() + 1500,
      };
      publishStats();
    }

    function loop(now) {
      if (stopped) {
        return;
      }

      const delta = Math.min(32, now - lastTime) / 16.67;
      lastTime = now;
      const fpsChanged = updateFps(now);

      if (shakeRef.current > 0.01) {
        shakeRef.current *= 0.84;
        const amount = shakeRef.current;
        canvas.style.transform = `translate(${(Math.random() - 0.5) * amount}px, ${(Math.random() - 0.5) * amount}px)`;
      } else if (canvas.style.transform) {
        shakeRef.current = 0;
        canvas.style.transform = '';
      }

      const { width, height } = sizeRef.current;
      const levelConfig = getLevelConfig(levelRef.current, difficulty);
      const weapon = weaponRef.current;
      const energy = energyRef.current;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(3, 7, 14, 0.22)';
      ctx.fillRect(0, 0, width, height);

      if (pausedRef.current) {
        fruitsRef.current.forEach((fruit) => drawFruit(ctx, fruit));
        halvesRef.current.forEach((half) => drawHalf(ctx, half));
        drawParticles(ctx, particlesRef.current);
        drawSlashes(ctx, slashesRef.current);
        drawImpactRings(ctx, impactRingsRef.current);
        drawFloatingTexts(ctx, floatingTextsRef.current);
        drawTrail(ctx, trailRef.current, energy);
        drawSword(ctx, swordRef.current, swordImageRef.current, width, weapon, energy);
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 44px Inter, system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSA', width / 2, height / 2);
        ctx.restore();
        animationRef.current = requestAnimationFrame(loop);
        return;
      }

      if (!inputReadyRef.current) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 22px Inter, system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(inputStatus, width / 2, height / 2);
        ctx.restore();
        animationRef.current = requestAnimationFrame(loop);
        return;
      }

      if (shouldSpawnFruit(lastSpawnRef.current, now, levelConfig)) {
        fruitsRef.current.push(createFruit(width, height, levelConfig));
        lastSpawnRef.current = now;
      }

      const activePoint = inputModeRef.current === 'mouse' ? mousePointRef.current : inputPointRef.current;
      const sword = updateSword(swordRef.current, activePoint, width, height, weapon);
      const previousTip = { x: sword.previousTipX, y: sword.previousTipY };
      const currentTip = { x: sword.tipX, y: sword.tipY };

      if (sword.hasPoint) {
        trailRef.current.push({ x: currentTip.x, y: currentTip.y, life: 1 });
        if (trailRef.current.length > weapon.trailLength) {
          trailRef.current.shift();
        }
      }

      for (let i = trailRef.current.length - 1; i >= 0; i -= 1) {
        trailRef.current[i].life -= 0.07 * delta;
        if (trailRef.current[i].life <= 0) {
          trailRef.current.splice(i, 1);
        }
      }

      for (let i = fruitsRef.current.length - 1; i >= 0; i -= 1) {
        const fruit = fruitsRef.current[i];
        fruit.x += fruit.velocityX * delta;
        fruit.y += fruit.velocityY * delta;
        fruit.velocityY += GRAVITY * delta;
        fruit.rotation += fruit.spin * delta;

        const hit = sword.hasPoint && segmentIntersectsCircle(previousTip, currentTip, fruit);
        if (hit && !fruit.sliced) {
          fruit.sliced = true;
          fruitsRef.current.splice(i, 1);
          slashesRef.current.push(createCutSlash(previousTip, currentTip));

          if (fruit.type === 'bomb') {
            comboRef.current = 0;
            callbacksRef.current.onLoseLife();
            lostLivesRef.current += 1;
            playSound('explosion');
            shakeRef.current = Math.max(shakeRef.current, 16);
            impactRingsRef.current.push(createImpactRing(fruit.x, fruit.y, '#ff6537', true));
            floatingTextsRef.current.push(createFloatingText(fruit.x, fruit.y - 18, '- VIDA', '#ff6537'));
            particlesRef.current.push(...createParticles(fruit.x, fruit.y, '#ff6537', 28, true));
            if (lostLivesRef.current >= 3) {
              playSound('gameover');
              callbacksRef.current.onGameOver(scoreRef.current);
              stopped = true;
            }
          } else {
            const fruitConfig = FRUIT_TYPES[fruit.type];
            comboRef.current = now - lastSliceTimeRef.current <= COMBO_WINDOW_MS ? comboRef.current + 1 : 1;
            lastSliceTimeRef.current = now;
            const comboBonus = comboRef.current >= 3 ? (comboRef.current - 2) * 5 : 0;
            const earnedPoints = Math.round((fruitConfig.points + comboBonus) * weapon.power);
            scoreRef.current += earnedPoints;
            levelFruitCountRef.current += 1;
            totalFruitCountRef.current += 1;
            callbacksRef.current.onScore(earnedPoints);
            playSound(comboRef.current >= 3 ? 'combo' : 'slice');
            shakeRef.current = Math.max(shakeRef.current, comboRef.current >= 3 ? 7 : 4);
            halvesRef.current.push(...createHalves(fruit));
            impactRingsRef.current.push(createImpactRing(fruit.x, fruit.y, energy.color));
            floatingTextsRef.current.push(createFloatingText(
              fruit.x,
              fruit.y - fruit.radius,
              comboRef.current >= 3 ? `+${earnedPoints} COMBO x${comboRef.current}` : `+${earnedPoints}`,
              comboRef.current >= 3 ? '#ffdc5f' : '#ffffff',
            ));
            particlesRef.current.push(...createParticles(fruit.x, fruit.y, fruitConfig.splash, comboRef.current >= 3 ? 18 : 12));
            publishStats();

            if (levelFruitCountRef.current >= levelConfig.target) {
              completeLevel();
            }
          }
        } else if (fruit.y - fruit.radius > height + 40 || fruit.x < -120 || fruit.x > width + 120) {
          fruitsRef.current.splice(i, 1);
          if (fruit.type !== 'bomb') {
            comboRef.current = 0;
            callbacksRef.current.onLoseLife();
            lostLivesRef.current += 1;
            floatingTextsRef.current.push(createFloatingText(fruit.x, Math.min(height - 60, fruit.y), 'PERDISTE UNA', '#ff5365'));
            if (lostLivesRef.current >= 3) {
              playSound('gameover');
              callbacksRef.current.onGameOver(scoreRef.current);
              stopped = true;
            }
          }
        }
      }

      for (let i = halvesRef.current.length - 1; i >= 0; i -= 1) {
        const half = halvesRef.current[i];
        half.x += half.vx * delta;
        half.y += half.vy * delta;
        half.vy += GRAVITY * 1.15 * delta;
        half.rotation += half.spin * 1.8 * delta;
        half.life -= 0.015 * delta;
        if (half.life <= 0 || half.y > height + 120 || halvesRef.current.length > MAX_HALVES) {
          halvesRef.current.splice(i, 1);
        }
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i -= 1) {
        const particle = particlesRef.current[i];
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.vy += 0.08 * delta;
        particle.life -= particle.decay * delta;
        particle.size = Math.max(0, particle.size - 0.035 * delta);
        if (particle.life <= 0 || particlesRef.current.length > MAX_PARTICLES) {
          particlesRef.current.splice(i, 1);
        }
      }

      for (let i = slashesRef.current.length - 1; i >= 0; i -= 1) {
        slashesRef.current[i].life -= 0.08 * delta;
        if (slashesRef.current[i].life <= 0) {
          slashesRef.current.splice(i, 1);
        }
      }

      for (let i = impactRingsRef.current.length - 1; i >= 0; i -= 1) {
        const ring = impactRingsRef.current[i];
        ring.radius += ring.speed * delta;
        ring.life -= ring.decay * delta;
        if (ring.life <= 0 || impactRingsRef.current.length > MAX_IMPACT_RINGS) {
          impactRingsRef.current.splice(i, 1);
        }
      }

      for (let i = floatingTextsRef.current.length - 1; i >= 0; i -= 1) {
        const text = floatingTextsRef.current[i];
        text.y += text.vy * delta;
        text.life -= 0.024 * delta;
        if (text.life <= 0 || floatingTextsRef.current.length > MAX_FLOATING_TEXTS) {
          floatingTextsRef.current.splice(i, 1);
        }
      }

      fruitsRef.current.forEach((fruit) => drawFruit(ctx, fruit));
      halvesRef.current.forEach((half) => drawHalf(ctx, half));
      drawParticles(ctx, particlesRef.current);
      drawSlashes(ctx, slashesRef.current);
      drawImpactRings(ctx, impactRingsRef.current);
      drawFloatingTexts(ctx, floatingTextsRef.current);
      drawTrail(ctx, trailRef.current, energy);
      drawSword(ctx, sword, swordImageRef.current, width, weapon, energy);

      if (levelMessageRef.current && now < levelMessageRef.current.until) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.fillRect(0, height * 0.38, width, 126);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 42px Inter, system-ui';
        ctx.fillText(levelMessageRef.current.text, width / 2, height * 0.45);
        ctx.fillStyle = '#79f2ff';
        ctx.font = '800 28px Inter, system-ui';
        ctx.fillText(`Nivel ${levelMessageRef.current.level}`, width / 2, height * 0.45 + 42);
        ctx.restore();
      }

      if (fpsChanged) {
        publishStats();
      }

      animationRef.current = requestAnimationFrame(loop);
    }

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      stopped = true;
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
      fruitsRef.current = [];
      halvesRef.current = [];
      particlesRef.current = [];
      trailRef.current = [];
      slashesRef.current = [];
      impactRingsRef.current = [];
      floatingTextsRef.current = [];
      canvas.style.transform = '';
      scoreRef.current = 0;
      lostLivesRef.current = 0;
      comboRef.current = 0;
      lastSliceTimeRef.current = 0;
      shakeRef.current = 0;
      levelRef.current = startLevel;
      levelFruitCountRef.current = 0;
      totalFruitCountRef.current = 0;
    };
  }, [difficulty, handleResize, inputPointRef, inputStatus, startLevel]);

  const handlePointerMove = useCallback((event) => {
    if (inputMode !== 'mouse') {
      return;
    }

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    mousePointRef.current = {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  }, [inputMode]);

  const handlePointerLeave = useCallback(() => {
    if (inputMode === 'mouse') {
      mousePointRef.current = null;
    }
  }, [inputMode]);

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      aria-label="Fruit Ninja game canvas"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    />
  );
}
