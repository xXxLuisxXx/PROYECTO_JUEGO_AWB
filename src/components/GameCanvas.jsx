import { useCallback, useEffect, useRef } from 'react';
import { segmentIntersectsCircle } from '../services/collision.js';
import { createFruit, FRUIT_TYPES, shouldSpawnFruit } from '../services/fruitGenerator.js';
import { getLevelConfig, MAX_LEVEL } from '../services/levels.js';
import { createSwordState, drawSword, SWORD_CONFIG, updateSword } from '../services/sword.js';

const GRAVITY = 0.22;
const MAX_PARTICLES = 120;
const MAX_HALVES = 44;
const SOUNDS = {
  slice: '/src/assets/sounds/slice.mp3',
  explosion: '/src/assets/sounds/explosion.mp3',
  gameover: '/src/assets/sounds/gameover.mp3',
};

function playSound(name) {
  const audio = new Audio(SOUNDS[name]);
  audio.volume = name === 'explosion' ? 0.38 : 0.3;
  audio.play().catch(() => {});
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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

function drawFruit(ctx, fruit) {
  if (fruit.type === 'bomb') {
    drawBomb(ctx, fruit);
    return;
  }

  const config = FRUIT_TYPES[fruit.type];
  ctx.save();
  ctx.translate(fruit.x, fruit.y);
  ctx.rotate(fruit.rotation);
  ctx.shadowColor = config.splash;
  ctx.shadowBlur = 10;
  ctx.fillStyle = config.color;
  ctx.beginPath();

  if (fruit.type === 'banana') {
    ctx.ellipse(0, 0, fruit.radius * 0.55, fruit.radius * 1.05, -0.7, 0, Math.PI * 2);
  } else if (fruit.type === 'pineapple') {
    ctx.roundRect(-fruit.radius * 0.65, -fruit.radius * 0.8, fruit.radius * 1.3, fruit.radius * 1.6, 10);
  } else if (fruit.type === 'watermelon' || fruit.type === 'mango' || fruit.type === 'coconut') {
    ctx.ellipse(0, 0, fruit.radius * 1.05, fruit.radius * 0.86, 0, 0, Math.PI * 2);
  } else if (fruit.type === 'pear') {
    ctx.ellipse(0, fruit.radius * 0.12, fruit.radius * 0.86, fruit.radius * 1.06, 0, 0, Math.PI * 2);
  } else if (fruit.type === 'strawberry') {
    ctx.moveTo(0, fruit.radius);
    ctx.bezierCurveTo(-fruit.radius, fruit.radius * 0.28, -fruit.radius * 0.72, -fruit.radius, 0, -fruit.radius * 0.62);
    ctx.bezierCurveTo(fruit.radius * 0.72, -fruit.radius, fruit.radius, fruit.radius * 0.28, 0, fruit.radius);
  } else {
    ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
  }

  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = config.flesh;
  ctx.globalAlpha = 0.86;
  ctx.beginPath();
  ctx.arc(-fruit.radius * 0.22, -fruit.radius * 0.22, fruit.radius * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (fruit.type === 'pineapple') {
    ctx.strokeStyle = '#815414';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-fruit.radius, i * 14);
      ctx.lineTo(fruit.radius, i * 14 + 20);
      ctx.stroke();
    }
  }

  ctx.fillStyle = 'rgba(8, 12, 18, 0.55)';
  ctx.font = `800 ${Math.max(17, fruit.radius * 0.56)}px Inter, system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(config.emoji, 0, 2);
  ctx.restore();
}

function drawBomb(ctx, bomb) {
  ctx.save();
  ctx.translate(bomb.x, bomb.y);
  ctx.rotate(bomb.rotation);
  ctx.shadowColor = '#ff6537';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#1c2029';
  ctx.beginPath();
  ctx.arc(0, 0, bomb.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffce73';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, bomb.radius * 0.68, -0.8, 0.8);
  ctx.stroke();
  ctx.fillStyle = '#ff6537';
  ctx.beginPath();
  ctx.arc(bomb.radius * 0.36, -bomb.radius * 0.62, 7, 0, Math.PI * 2);
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

function drawTrail(ctx, trail) {
  for (let i = 1; i < trail.length; i += 1) {
    const previous = trail[i - 1];
    const point = trail[i];
    const alpha = point.life * (i / trail.length);
    ctx.strokeStyle = `rgba(121, 242, 255, ${alpha})`;
    ctx.lineWidth = 4 + i * 0.35;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#79f2ff';
    ctx.shadowBlur = 9;
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
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#79f2ff';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(slash.x1, slash.y1);
    ctx.lineTo(slash.x2, slash.y2);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

export default function GameCanvas({
  handPointRef,
  isCameraReady,
  onScore,
  onLoseLife,
  onGameOver,
  onLevelStats,
  onVictory,
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(0);
  const sizeRef = useRef({ width: 0, height: 0 });
  const fruitsRef = useRef([]);
  const halvesRef = useRef([]);
  const particlesRef = useRef([]);
  const trailRef = useRef([]);
  const slashesRef = useRef([]);
  const swordRef = useRef(createSwordState());
  const swordImageRef = useRef(null);
  const cameraReadyRef = useRef(isCameraReady);
  const lastSpawnRef = useRef(0);
  const scoreRef = useRef(0);
  const lostLivesRef = useRef(0);
  const levelRef = useRef(1);
  const levelFruitCountRef = useRef(0);
  const totalFruitCountRef = useRef(0);
  const levelMessageRef = useRef(null);
  const fpsRef = useRef({ frames: 0, lastTime: performance.now(), value: 0 });
  const callbacksRef = useRef({ onScore, onLoseLife, onGameOver, onLevelStats, onVictory });

  useEffect(() => {
    callbacksRef.current = { onScore, onLoseLife, onGameOver, onLevelStats, onVictory };
  }, [onGameOver, onLevelStats, onLoseLife, onScore, onVictory]);

  useEffect(() => {
    cameraReadyRef.current = isCameraReady;
  }, [isCameraReady]);

  useEffect(() => {
    const image = new Image();
    image.src = SWORD_CONFIG.spriteUrl;
    swordImageRef.current = image;
  }, []);

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

    handleResize();
    window.addEventListener('resize', handleResize);
    callbacksRef.current.onLevelStats({
      level: 1,
      target: getLevelConfig(1).target,
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
      const levelConfig = getLevelConfig(levelRef.current);
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

      const { width, height } = sizeRef.current;
      const levelConfig = getLevelConfig(levelRef.current);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(3, 7, 14, 0.22)';
      ctx.fillRect(0, 0, width, height);

      if (shouldSpawnFruit(lastSpawnRef.current, now, levelConfig)) {
        fruitsRef.current.push(createFruit(width, height, levelConfig));
        lastSpawnRef.current = now;
      }

      const sword = updateSword(swordRef.current, handPointRef.current, width, height);
      const previousTip = { x: sword.previousTipX, y: sword.previousTipY };
      const currentTip = { x: sword.tipX, y: sword.tipY };

      if (sword.hasPoint) {
        trailRef.current.push({ x: currentTip.x, y: currentTip.y, life: 1 });
        if (trailRef.current.length > SWORD_CONFIG.trailLength) {
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
            callbacksRef.current.onLoseLife();
            lostLivesRef.current += 1;
            playSound('explosion');
            particlesRef.current.push(...createParticles(fruit.x, fruit.y, '#ff6537', 28, true));
            if (lostLivesRef.current >= 3) {
              playSound('gameover');
              callbacksRef.current.onGameOver(scoreRef.current);
              stopped = true;
            }
          } else {
            const fruitConfig = FRUIT_TYPES[fruit.type];
            scoreRef.current += fruitConfig.points;
            levelFruitCountRef.current += 1;
            totalFruitCountRef.current += 1;
            callbacksRef.current.onScore(fruitConfig.points);
            playSound('slice');
            halvesRef.current.push(...createHalves(fruit));
            particlesRef.current.push(...createParticles(fruit.x, fruit.y, fruitConfig.splash, 16));
            publishStats();

            if (levelFruitCountRef.current >= levelConfig.target) {
              completeLevel();
            }
          }
        } else if (fruit.y - fruit.radius > height + 40 || fruit.x < -120 || fruit.x > width + 120) {
          fruitsRef.current.splice(i, 1);
          if (fruit.type !== 'bomb') {
            callbacksRef.current.onLoseLife();
            lostLivesRef.current += 1;
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

      fruitsRef.current.forEach((fruit) => drawFruit(ctx, fruit));
      halvesRef.current.forEach((half) => drawHalf(ctx, half));
      drawParticles(ctx, particlesRef.current);
      drawSlashes(ctx, slashesRef.current);
      drawTrail(ctx, trailRef.current);
      drawSword(ctx, sword, swordImageRef.current, width);

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

      if (!cameraReadyRef.current) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 22px Inter, system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Activando camara y MediaPipe...', width / 2, height / 2);
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
      scoreRef.current = 0;
      lostLivesRef.current = 0;
      levelRef.current = 1;
      levelFruitCountRef.current = 0;
      totalFruitCountRef.current = 0;
    };
  }, [handleResize, handPointRef]);

  return <canvas ref={canvasRef} className="game-canvas" aria-label="Fruit Ninja Cam game canvas" />;
}
