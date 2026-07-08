const SOUNDS = {
  slice: '/assets/sounds/slice.wav',
  combo: '/assets/sounds/combo.wav',
  explosion: '/assets/sounds/explosion.wav',
  gameover: '/assets/sounds/gameover.wav',
};

const audioPools = new Map();

function getVolume(name) {
  if (name === 'explosion') {
    return 0.62;
  }
  if (name === 'gameover') {
    return 0.58;
  }
  return 0.7;
}

function getPool(name) {
  if (!audioPools.has(name)) {
    audioPools.set(
      name,
      Array.from({ length: name === 'slice' ? 6 : 2 }, () => {
        const audio = new Audio(SOUNDS[name]);
        audio.volume = getVolume(name);
        audio.preload = 'auto';
        return audio;
      }),
    );
  }

  return audioPools.get(name);
}

export function unlockGameAudio() {
  Object.keys(SOUNDS).forEach((name) => {
    const audio = getPool(name)[0];
    const previousVolume = audio.volume;
    audio.volume = 0;
    audio.play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = previousVolume;
      })
      .catch(() => {
        audio.volume = previousVolume;
      });
  });
}

export function playSound(name) {
  const pool = getPool(name);
  const audio = pool.find((item) => item.paused || item.ended) || pool[0];

  try {
    audio.currentTime = 0;
  } catch {
    // El navegador puede bloquear el seek si el audio aun no tiene metadata.
  }

  audio.volume = getVolume(name);
  audio.play().catch(() => {});
}
