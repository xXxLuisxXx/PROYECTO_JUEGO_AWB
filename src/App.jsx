import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CameraTracker from './components/CameraTracker.jsx';
import GameControls from './components/GameControls.jsx';
import GameCanvas from './components/GameCanvas.jsx';
import GameOver from './components/GameOver.jsx';
import ScoreBoard from './components/ScoreBoard.jsx';
import StartScreen from './components/StartScreen.jsx';
import useHandTracking from './hooks/useHandTracking.js';
import { getLevelConfig } from './services/levels.js';

const RECORD_KEY = 'fruit-ninja-cam-record';
const RANKINGS_KEY = 'fruit-ninja-cam-rankings';
const EMPTY_RANKINGS = {
  camera: [],
  mouse: [],
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
    return {
      camera: Array.isArray(stored?.camera) ? trimScores(stored.camera.filter((entry) => entry.score > 0)) : [],
      mouse: Array.isArray(stored?.mouse) ? trimScores(stored.mouse.filter((entry) => entry.score > 0)) : [],
    };
  } catch {
    return EMPTY_RANKINGS;
  }
}

function trimScores(scores) {
  return [...scores].sort((a, b) => b.score - a.score).slice(0, MAX_RANKING_ENTRIES);
}

function getBestScore(rankings) {
  return Math.max(0, ...Object.values(rankings).flat().map((entry) => entry.score));
}

export default function App() {
  const videoRef = useRef(null);
  const endedRef = useRef(false);
  const [status, setStatus] = useState('start');
  const [inputMode, setInputMode] = useState('camera');
  const [playerName, setPlayerName] = useState('');
  const [startLevel, setStartLevel] = useState(1);
  const [difficulty, setDifficulty] = useState('normal');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [record, setRecord] = useState(() => Number(localStorage.getItem(RECORD_KEY) || 0));
  const [rankings, setRankings] = useState(loadRankings);
  const [totalFruits, setTotalFruits] = useState(0);
  const [levelStats, setLevelStats] = useState({
    level: 1,
    fruits: 0,
    target: 10,
    totalFruits: 0,
    fps: 0,
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
    const nextDifficulty = typeof settings === 'object' && settings.difficulty ? settings.difficulty : difficulty;
    const initialLevelConfig = getLevelConfig(nextStartLevel, nextDifficulty);

    endedRef.current = false;
    setPlayerName(normalizePlayerName(nextPlayerName));
    setStartLevel(nextStartLevel);
    setDifficulty(nextDifficulty);
    setScore(0);
    setLives(MAX_LIVES);
    setTotalFruits(0);
    setLevelStats({
      level: nextStartLevel,
      fruits: 0,
      target: initialLevelConfig.target,
      totalFruits: 0,
      fps: 0,
    });
    setStatus('playing');
  }, [difficulty, playerName, startLevel]);

  const goHome = useCallback(() => {
    endedRef.current = true;
    setStatus('start');
  }, []);

  const togglePause = useCallback(() => {
    setStatus((current) => (current === 'paused' ? 'playing' : 'paused'));
  }, []);

  const saveRanking = useCallback((finalScore) => {
    if (finalScore <= 0) {
      return;
    }

    setRankings((currentRankings) => {
      const nextRankings = {
        ...EMPTY_RANKINGS,
        ...currentRankings,
        [inputMode]: trimScores([
          ...(currentRankings[inputMode] || []),
          {
            name: normalizePlayerName(playerName),
            score: finalScore,
            date: new Date().toISOString(),
          },
        ]),
      };
      localStorage.setItem(RANKINGS_KEY, JSON.stringify(nextRankings));
      return nextRankings;
    });
  }, [inputMode, playerName]);

  const saveRecord = useCallback((finalScore) => {
    setRecord((currentRecord) => {
      const nextRecord = Math.max(currentRecord, finalScore);
      localStorage.setItem(RECORD_KEY, String(nextRecord));
      return nextRecord;
    });
  }, []);

  const clearRanking = useCallback((mode) => {
    setRankings((currentRankings) => {
      const nextRankings = {
        ...EMPTY_RANKINGS,
        ...currentRankings,
        [mode]: [],
      };
      const nextRecord = getBestScore(nextRankings);
      localStorage.setItem(RANKINGS_KEY, JSON.stringify(nextRankings));
      localStorage.setItem(RECORD_KEY, String(nextRecord));
      setRecord(nextRecord);
      return nextRankings;
    });
  }, []);

  const finishGame = useCallback((finalScore = score) => {
    if (endedRef.current) {
      return;
    }

    endedRef.current = true;
    setScore(finalScore);
    setStatus('gameover');
    saveRecord(finalScore);
    saveRanking(finalScore);
  }, [saveRanking, saveRecord, score]);

  const finishVictory = useCallback(({ score: finalScore, totalFruits: finalTotalFruits }) => {
    if (endedRef.current) {
      return;
    }

    endedRef.current = true;
    setScore(finalScore);
    setTotalFruits(finalTotalFruits);
    setStatus('victory');
    saveRecord(finalScore);
    saveRanking(finalScore);
  }, [saveRanking, saveRecord]);

  const updateLevelStats = useCallback((nextStats) => {
    setLevelStats(nextStats);
    setTotalFruits(nextStats.totalFruits);
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
          />

          <GameControls
            paused={isPaused}
            onPauseToggle={togglePause}
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
            difficulty={difficulty}
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
