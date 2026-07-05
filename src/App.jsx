import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CameraTracker from './components/CameraTracker.jsx';
import GameCanvas from './components/GameCanvas.jsx';
import GameOver from './components/GameOver.jsx';
import ScoreBoard from './components/ScoreBoard.jsx';
import StartScreen from './components/StartScreen.jsx';
import useHandTracking from './hooks/useHandTracking.js';

const RECORD_KEY = 'fruit-ninja-cam-record';

export default function App() {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('start');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [record, setRecord] = useState(() => Number(localStorage.getItem(RECORD_KEY) || 0));
  const [totalFruits, setTotalFruits] = useState(0);
  const [levelStats, setLevelStats] = useState({
    level: 1,
    fruits: 0,
    target: 10,
    totalFruits: 0,
    fps: 0,
  });

  const isPlaying = status === 'playing';
  const { handPointRef, isCameraReady, error } = useHandTracking(videoRef, isPlaying);

  const startGame = useCallback(() => {
    setScore(0);
    setLives(3);
    setTotalFruits(0);
    setLevelStats({
      level: 1,
      fruits: 0,
      target: 10,
      totalFruits: 0,
      fps: 0,
    });
    setStatus('playing');
  }, []);

  const saveRecord = useCallback((finalScore) => {
    setRecord((currentRecord) => {
      const nextRecord = Math.max(currentRecord, finalScore);
      localStorage.setItem(RECORD_KEY, String(nextRecord));
      return nextRecord;
    });
  }, []);

  const finishGame = useCallback((finalScore = score) => {
    setScore(finalScore);
    setStatus('gameover');
    saveRecord(finalScore);
  }, [saveRecord, score]);

  const finishVictory = useCallback(({ score: finalScore, totalFruits: finalTotalFruits }) => {
    setScore(finalScore);
    setTotalFruits(finalTotalFruits);
    setStatus('victory');
    saveRecord(finalScore);
  }, [saveRecord]);

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
      <CameraTracker videoRef={videoRef} active={isPlaying} />

      {status === 'start' && <StartScreen onStart={startGame} />}

      {isPlaying && (
        <>
          <ScoreBoard
            score={score}
            lives={lives}
            record={gameState.record}
            levelStats={levelStats}
            showFps
          />
          <GameCanvas
            handPointRef={handPointRef}
            isCameraReady={isCameraReady}
            onScore={addScore}
            onLoseLife={loseLife}
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
          onRestart={startGame}
        />
      )}

      {status === 'victory' && (
        <GameOver
          score={score}
          record={Math.max(record, score)}
          totalFruits={totalFruits}
          type="victory"
          onRestart={startGame}
        />
      )}

      {error && (
        <div className="camera-error" role="alert">
          {error}
        </div>
      )}
    </main>
  );
}
