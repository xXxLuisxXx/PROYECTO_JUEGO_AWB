import { Camera, MousePointer2, Play, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { MAX_LEVEL } from '../services/levels.js';
import RankingBoard from './RankingBoard.jsx';

export default function StartScreen({ inputMode, onModeChange, onStart, rankings, onClearRanking }) {
  const [playerName, setPlayerName] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [selectedDifficulty, setSelectedDifficulty] = useState('normal');
  const levels = Array.from({ length: MAX_LEVEL }, (_, index) => index + 1);

  return (
    <section className="screen-layer start-screen">
      <div className="brand-block">
        <div className="hero-panel">
          <div>
            <h1>Fruit Ninja</h1>
            <p className="start-copy">
              Elige tu nivel, prepara tu mano y corta frutas con movimientos rápidos.
            </p>
          </div>

          <div className="quick-actions">
            <div className="mode-switch" role="group" aria-label="Modo de control">
              <button
                className={inputMode === 'camera' ? 'mode-button mode-button-active' : 'mode-button'}
                type="button"
                onClick={() => onModeChange('camera')}
              >
                <Camera size={18} />
                Cámara
              </button>
              <button
                className={inputMode === 'mouse' ? 'mode-button mode-button-active' : 'mode-button'}
                type="button"
                onClick={() => onModeChange('mouse')}
              >
                <MousePointer2 size={18} />
                Mouse
              </button>
            </div>

            <button
              className="primary-button"
              type="button"
              onClick={() => {
                onStart({
                  playerName,
                  startLevel: selectedLevel,
                  difficulty: selectedDifficulty,
                });
              }}
              disabled={!playerName.trim()}
            >
              <Play size={20} />
              Iniciar juego
            </button>
          </div>
        </div>

        <div className="setup-panel">
          <div className="player-name-container">
            <span className="setting-label">Jugador</span>
            <input
              type="text"
              className="player-name-input"
              placeholder="Ingresa tu nombre"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={15}
            />
          </div>

          <div className="difficulty-container">
            <span className="setting-label">Dificultad</span>
            <div className="difficulty-buttons">
              <button
                type="button"
                className={`diff-btn easy ${selectedDifficulty === 'easy' ? 'active' : ''}`}
                onClick={() => setSelectedDifficulty('easy')}
              >
                <ShieldCheck size={14} /> Fácil
              </button>
              <button
                type="button"
                className={`diff-btn normal ${selectedDifficulty === 'normal' ? 'active' : ''}`}
                onClick={() => setSelectedDifficulty('normal')}
              >
                <Shield size={14} /> Normal
              </button>
              <button
                type="button"
                className={`diff-btn hard ${selectedDifficulty === 'hard' ? 'active' : ''}`}
                onClick={() => setSelectedDifficulty('hard')}
              >
                <ShieldAlert size={14} /> Difícil
              </button>
            </div>
          </div>

          <div className="level-selector-container">
            <span className="setting-label">Nivel inicial</span>
            <div className="level-grid-board">
              <div className="level-grid">
                {levels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`level-grid-item ${selectedLevel === level ? 'active' : ''}`}
                    onClick={() => setSelectedLevel(level)}
                  >
                    <span className="level-number">{level}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <RankingBoard rankings={rankings} activeMode={inputMode} onClear={onClearRanking} />
      </div>
    </section>
  );
}
