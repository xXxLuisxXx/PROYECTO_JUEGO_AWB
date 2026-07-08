const SOUNDS = {
  slice: '/assets/sounds/slice.wav',
  combo: '/assets/sounds/combo.wav',
  explosion: '/assets/sounds/explosion.wav',
  gameover: '/assets/sounds/gameover.wav',
};

const audioPools = new Map();
let audioContext = null;

function getAudioContext() {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextConstructor();
  }

  return audioContext;
}

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
  const context = getAudioContext();
  if (context) {
    context.resume().then(() => {
      const gain = context.createGain();
      gain.gain.value = 0;
      gain.connect(context.destination);
      const oscillator = context.createOscillator();
      oscillator.connect(gain);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.01);
    }).catch(() => {});
  }

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

function playTone({ frequency, endFrequency, duration, type = 'sine', volume = 0.16 }) {
  const context = getAudioContext();
  if (!context || context.state !== 'running') {
    return false;
  }

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
  return true;
}

function playNoise({ duration, volume = 0.16 }) {
  const context = getAudioContext();
  if (!context || context.state !== 'running') {
    return false;
  }

  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }

  const source = context.createBufferSource();
  const gain = context.createGain();
  gain.gain.value = volume;
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(context.destination);
  source.start();
  return true;
}

function playSynthSound(name) {
  if (name === 'slice') {
    return playTone({ frequency: 1800, endFrequency: 420, duration: 0.11, type: 'sawtooth', volume: 0.18 });
  }

  if (name === 'combo') {
    const first = playTone({ frequency: 820, endFrequency: 1220, duration: 0.12, type: 'triangle', volume: 0.14 });
    window.setTimeout(() => {
      playTone({ frequency: 1220, endFrequency: 1720, duration: 0.14, type: 'triangle', volume: 0.14 });
    }, 70);
    return first;
  }

  if (name === 'explosion') {
    const noise = playNoise({ duration: 0.28, volume: 0.2 });
    playTone({ frequency: 110, endFrequency: 42, duration: 0.32, type: 'square', volume: 0.12 });
    return noise;
  }

  if (name === 'gameover') {
    const first = playTone({ frequency: 420, endFrequency: 260, duration: 0.22, type: 'triangle', volume: 0.16 });
    window.setTimeout(() => {
      playTone({ frequency: 260, endFrequency: 140, duration: 0.28, type: 'triangle', volume: 0.16 });
    }, 160);
    return first;
  }

  return false;
}

export function playSound(name) {
  const usedSynth = playSynthSound(name);
  const pool = getPool(name);
  const audio = pool.find((item) => item.paused || item.ended) || pool[0];

  try {
    audio.currentTime = 0;
  } catch {
    // El navegador puede bloquear el seek si el audio aun no tiene metadata.
  }

  audio.volume = getVolume(name);
  if (!usedSynth) {
    audio.play().catch(() => {});
  }
}
