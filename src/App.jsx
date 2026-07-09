import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CameraTracker from './components/CameraTracker.jsx';
import GameControls from './components/GameControls.jsx';
import GameCanvas from './components/GameCanvas.jsx';
import GameOver from './components/GameOver.jsx';
import ScoreBoard from './components/ScoreBoard.jsx';
import StartScreen from './components/StartScreen.jsx';
import useHandTracking from './hooks/useHandTracking.js';
import { isSoundEnabled, playSound, setSoundEnabled, startBackgroundMusic, stopBackgroundMusic } from './services/audio.js';
import { getLevelConfig } from './services/levels.js';

const RECORD_KEY = 'fruit-ninja-cam-record';
const RANKINGS_KEY = 'fruit-ninja-cam-global-ranking';
const LEGACY_RANKINGS_KEY = 'fruit-ninja-cam-rankings';
const STATS_KEY = 'fruit-ninja-cam-global-stats';
const PLAYER_KEY = 'fruit-ninja-cam-last-player';
const EMPTY_STATS = {
  gamesPlayed: 0,
  fruitsSliced: 0,
  bombsHit: 0,
  timePlayedMs: 0,
  maxLevelReached: 1,
};
const MAX_RANKING_ENTRIES = 50;
const MAX_LIVES = 3;

function normalizePlayerName(name) {
  const trimmedName = name.trim().replace(/\s+/g, ' ');
  return trimmedName || 'Jugador';
}

function loadRankings() {
  try {
    const stored = JSON.parse(localStorage.getItem(RANKINGS_KEY) || 'null');
    if (Array.isArray(stored)) {
      return trimScores(stored.filter((entry) => entry.score > 0));
    }

    const legacy = JSON.parse(localStorage.getItem(LEGACY_RANKINGS_KEY) || 'null');
    const legacyScores = [...(legacy?.camera || []), ...(legacy?.mouse || [])];
    return mergePlayerScores(legacyScores);
  } catch {
    return [];
  }
}

function trimScores(scores) {
  return [...scores].sort((a, b) => b.score - a.score).slice(0, MAX_RANKING_ENTRIES);
}

function mergePlayerScores(scores) {
  const byPlayer = new Map();

  scores.forEach((entry) => {
    const name = normalizePlayerName(entry.name || '');
    const key = name.toLocaleLowerCase();
    const current = byPlayer.get(key);
    const nextEntry = {
      name,
      score: Number(entry.score || 0),
      date: entry.date || new Date().toISOString(),
      level: Number(entry.level || 1),
      fruitsSliced: Number(entry.fruitsSliced || entry.fruits || 0),
      bombsHit: Number(entry.bombsHit || entry.bombs || 0),
    };

    if (!current || nextEntry.score > current.score) {
      byPlayer.set(key, nextEntry);
    }
  });

  return trimScores([...byPlayer.values()]);
}

function loadStats() {
  try {
    return { ...EMPTY_STATS, ...JSON.parse(localStorage.getItem(STATS_KEY) || 'null') };
  } catch {
    return EMPTY_STATS;
  }
}

export default function App() {
  const videoRef = useRef(null);
  const endedRef = useRef(false);
  const gameStartedAtRef = useRef(0);
  const runStatsRef = useRef({ level: 1, fruitsSliced: 0, bombsHit: 0 });
  const [status, setStatus] = useState('start');
  const [inputMode, setInputMode] = useState('camera');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem(PLAYER_KEY) || '');
  const [startLevel, setStartLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [record, setRecord] = useState(() => Number(localStorage.getItem(RECORD_KEY) || 0));
  const [rankings, setRankings] = useState(loadRankings);
  const [totalFruits, setTotalFruits] = useState(0);
  const [stats, setStats] = useState(loadStats);
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const [levelStats, setLevelStats] = useState({
    level: 1,
    fruits: 0,
    target: 10,
    totalFruits: 0,
    fps: 0,
    combo: 0,
    multiplier: 1,
  });

  const isPlaying = status === 'playing';
  const isPaused = status === 'paused';
  const isGameActive = isPlaying || isPaused;
  const usesCamera = inputMode === 'camera';

  const { handPointRef, isCameraReady, hasSeenHand, isHandVisible, error } = useHandTracking(
    videoRef,
    usesCamera && isPlaying,
  );

  const startGame = useCallback((settings = {}) => {
    const nextPlayerName = typeof settings === 'string' ? settings : settings.playerName || playerName;
    const nextStartLevel = typeof settings === 'object' && settings.startLevel ? settings.startLevel : startLevel;
    const initialLevelConfig = getLevelConfig(nextStartLevel);

    endedRef.current = false;
    gameStartedAtRef.current = performance.now();
    runStatsRef.current = { level: nextStartLevel, fruitsSliced: 0, bombsHit: 0 };
    setPlayerName(normalizePlayerName(nextPlayerName));
    localStorage.setItem(PLAYER_KEY, normalizePlayerName(nextPlayerName));
    setStartLevel(nextStartLevel);
    setScore(0);
    setLives(MAX_LIVES);
    setTotalFruits(0);
    setLevelStats({
      level: nextStartLevel,
      fruits: 0,
      target: initialLevelConfig.target,
      totalFruits: 0,
      fps: 0,
      combo: 0,
      multiplier: 1,
    });
    setStatus('playing');
  }, [playerName, startLevel]);

  const goHome = useCallback(() => {
    endedRef.current = true;
    setStatus('start');
  }, []);

  const togglePause = useCallback(() => {
    setStatus((current) => (current === 'paused' ? 'playing' : 'paused'));
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOn((current) => {
      const next = !current;
      setSoundEnabled(next);
      if (next && status === 'playing') {
        startBackgroundMusic();
      }
      return next;
    });
  }, [status]);

  const saveRanking = useCallback((finalScore, finalStats = runStatsRef.current) => {
    setRankings((currentRankings) => {
      const playerEntry = {
        name: normalizePlayerName(playerName),
        score: Math.max(0, finalScore),
        date: new Date().toISOString(),
        level: finalStats.level,
        fruitsSliced: finalStats.fruitsSliced,
        bombsHit: finalStats.bombsHit,
      };
      const nextRankings = mergePlayerScores([...currentRankings, playerEntry]);
      localStorage.setItem(RANKINGS_KEY, JSON.stringify(nextRankings));
      return nextRankings;
    });
  }, [playerName]);

  const saveRecord = useCallback((finalScore) => {
    setRecord((currentRecord) => {
      const nextRecord = Math.max(currentRecord, finalScore);
      if (finalScore > currentRecord) {
        playSound('record');
      }
      localStorage.setItem(RECORD_KEY, String(nextRecord));
      return nextRecord;
    });
  }, []);

  const clearRanking = useCallback(() => {
    if (!window.confirm('Seguro que quieres borrar todo el ranking local?')) {
      return;
    }

    setRankings([]);
    localStorage.setItem(RANKINGS_KEY, JSON.stringify([]));
    localStorage.setItem(RECORD_KEY, '0');
    setRecord(0);
  }, []);

  const persistStats = useCallback((finalStats = runStatsRef.current) => {
    const elapsed = gameStartedAtRef.current ? performance.now() - gameStartedAtRef.current : 0;
    setStats((currentStats) => {
      const nextStats = {
        ...currentStats,
        gamesPlayed: currentStats.gamesPlayed + 1,
        fruitsSliced: currentStats.fruitsSliced + finalStats.fruitsSliced,
        bombsHit: currentStats.bombsHit + finalStats.bombsHit,
        timePlayedMs: currentStats.timePlayedMs + elapsed,
        maxLevelReached: Math.max(currentStats.maxLevelReached, finalStats.level),
      };
      localStorage.setItem(STATS_KEY, JSON.stringify(nextStats));
      return nextStats;
    });
  }, []);

  const finishGame = useCallback((payload = score) => {
    if (endedRef.current) {
      return;
    }

    const finalScore = typeof payload === 'object' ? payload.score : payload;
    const finalStats = typeof payload === 'object' ? payload.stats : runStatsRef.current;
    endedRef.current = true;
    setScore(finalScore);
    setTotalFruits(finalStats.fruitsSliced);
    setStatus('gameover');
    saveRecord(finalScore);
    saveRanking(finalScore, finalStats);
    persistStats(finalStats);
  }, [persistStats, saveRanking, saveRecord, score]);

  const finishVictory = useCallback(({ score: finalScore, totalFruits: finalTotalFruits, stats: finalStats }) => {
    if (endedRef.current) {
      return;
    }

    const normalizedStats = finalStats || {
      ...runStatsRef.current,
      fruitsSliced: finalTotalFruits,
    };
    endedRef.current = true;
    setScore(finalScore);
    setTotalFruits(finalTotalFruits);
    setStatus('victory');
    saveRecord(finalScore);
    saveRanking(finalScore, normalizedStats);
    persistStats(normalizedStats);
  }, [persistStats, saveRanking, saveRecord]);

  const updateLevelStats = useCallback((nextStats) => {
    setLevelStats(nextStats);
    setTotalFruits(nextStats.totalFruits);
    runStatsRef.current = {
      level: nextStats.level,
      fruitsSliced: nextStats.totalFruits,
      bombsHit: nextStats.bombsHit || runStatsRef.current.bombsHit,
    };
  }, []);

  const addScore = useCallback((points) => {
    setScore((current) => current + points);
  }, []);

  const loseLife = useCallback(() => {
    setLives((current) => Math.max(0, current - 1));
  }, []);

  const recoverLife = useCallback(() => {
    setLives((current) => Math.min(MAX_LIVES, current + 1));
  }, []);

  useEffect(() => {
    if (isPlaying && lives <= 0) {
      finishGame(score);
    }
  }, [finishGame, isPlaying, lives, score]);

  useEffect(() => {
    if (status === 'playing' && soundOn) {
      startBackgroundMusic();
    } else {
      stopBackgroundMusic();
    }

    return () => stopBackgroundMusic();
  }, [soundOn, status]);

  const gameState = useMemo(
    () => ({
      score,
      lives,
      record: Math.max(record, score),
    }),
    [lives, record, score],
  );

  return (
    <main className="app-shell">
      <CameraTracker videoRef={videoRef} active={usesCamera && isPlaying} />

      {status === 'start' && (
        <StartScreen
          inputMode={inputMode}
          rankings={rankings}
          stats={stats}
          onClearRanking={clearRanking}
          onModeChange={setInputMode}
          onStart={startGame}
        />
      )}

      {isGameActive && (
        <>
          <ScoreBoard
            score={score}
            lives={lives}
            record={gameState.record}
            levelStats={levelStats}
            playerName={playerName}
          />

          <GameControls
            paused={isPaused}
            soundEnabled={soundOn}
            onPauseToggle={togglePause}
            onSoundToggle={toggleSound}
            onHome={goHome}
          />

          <GameCanvas
            inputPointRef={handPointRef}
            inputMode={inputMode}
            isInputReady={!usesCamera || (isCameraReady && hasSeenHand)}
            inputStatus={
              usesCamera && isCameraReady && !isHandVisible
                ? 'Pon tu mano frente a la cámara'
                : 'Activando cámara...'
            }
            lives={lives}
            startLevel={startLevel}
            paused={isPaused}
            onScore={addScore}
            onLoseLife={loseLife}
            onRecoverLife={recoverLife}
            onGameOver={finishGame}
            onLevelStats={updateLevelStats}
            onVictory={finishVictory}
          />
        </>
      )}

      {status === 'gameover' && (
        <GameOver
          score={score}
          record={record}
          totalFruits={totalFruits}
          type="gameover"
          rankings={rankings}
          inputMode={inputMode}
          stats={stats}
          onClearRanking={clearRanking}
          onRestart={startGame}
          onHome={goHome}
        />
      )}

      {status === 'victory' && (
        <GameOver
          score={score}
          record={Math.max(record, score)}
          totalFruits={totalFruits}
          type="victory"
          rankings={rankings}
          inputMode={inputMode}
          stats={stats}
          onClearRanking={clearRanking}
          onRestart={startGame}
          onHome={goHome}
        />
      )}

      {usesCamera && error && (
        <div className="camera-error" role="alert">
          {error}
        </div>
      )}
    </main>
  );
}
