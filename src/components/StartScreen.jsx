import { Camera, ListOrdered, MousePointer2, Play, Settings } from 'lucide-react';
import { useState } from 'react';
import { unlockGameAudio } from '../services/audio.js';
import { MAX_LEVEL } from '../services/levels.js';
import RankingBoard from './RankingBoard.jsx';

export default function StartScreen({ inputMode, onModeChange, onStart, rankings, stats, onClearRanking }) {
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('fruit-ninja-cam-last-player') || '');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [view, setView] = useState('play');
  const levels = Array.from({ length: MAX_LEVEL }, (_, index) => index + 1);

  return (
    <section className="screen-layer start-screen">
      <div className="brand-block">
        <div className="hero-panel">
          <div>
            <h1>Fruit Ninja</h1>
            <p className="start-copy">
              Prepara tu mano y corta frutas con movimientos rapidos.
            </p>
            <label className="player-name-field player-name-field-hero">
              <span>Nombre del jugador</span>
              <input
                type="text"
                placeholder="Ingresa tu nombre"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={15}
              />
            </label>
          </div>

          <div className="quick-actions">
            <div className="view-switch" role="group" aria-label="Vista">
              <button
                className={view === 'play' ? 'mode-button mode-button-active' : 'mode-button'}
                type="button"
                onClick={() => setView('play')}
              >
                <Settings size={18} />
                Juego
              </button>
              <button
                className={view === 'ranking' ? 'mode-button mode-button-active' : 'mode-button'}
                type="button"
                onClick={() => setView('ranking')}
              >
                <ListOrdered size={18} />
                Ranking
              </button>
            </div>

            <div className="mode-switch" role="group" aria-label="Modo de control">
              <button
                className={inputMode === 'camera' ? 'mode-button mode-button-active' : 'mode-button'}
                type="button"
                onClick={() => onModeChange('camera')}
              >
                <Camera size={18} />
                Camara
              </button>
              <button
                className={inputMode === 'mouse' ? 'mode-button mode-button-active' : 'mode-button'}
                type="button"
                onClick={() => onModeChange('mouse')}
              >
                <MousePointer2 size={18} />
                Táctil / mouse
              </button>
            </div>

            <button
              className="primary-button"
              type="button"
              onClick={() => {
                unlockGameAudio();
                onStart({
                  playerName,
                  startLevel: selectedLevel,
                });
              }}
              disabled={!playerName.trim()}
            >
              <Play size={20} />
              Iniciar juego
            </button>
          </div>
        </div>

        {view === 'play' ? (
          <div className="setup-panel">
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
        ) : (
          <RankingBoard rankings={rankings} stats={stats} onClear={onClearRanking} />
        )}

      </div>
    </section>
  );
}
