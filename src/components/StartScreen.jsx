import { Camera, MousePointer2, Play, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import RankingBoard from './RankingBoard.jsx';
import { useState } from 'react';


export default function StartScreen({ inputMode, onModeChange, onStart, rankings, onClearRanking }) {
  const [playerName, setPlayerName] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [selectedDifficulty, setSelectedDifficulty] = useState('normal');

  // Ampliamos la lista para que muestre exactamente 15 niveles
  const listaNiveles = [
    1, 2, 3, 4, 5, 
    6, 7, 8, 9, 10, 
    11, 12, 13, 14, 15
  ]; 

  return (
    <section className="screen-layer start-screen">
      <div className="brand-block">
        <p className="eyebrow">Camara oculta o mouse</p>
        <h1>FRUIT NINJA CAM</h1>
        <p className="start-copy">
          Corta frutas con tu dedo indice sin mostrar tu rostro, o cambia a mouse para jugar sin camara.
        </p>

        <div className="player-name-container">
          <span className="setting-label">Nombre del jugador</span>
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
          <span className="setting-label">Selecciona un Nivel</span>
          <div className="level-grid-board">
            <div className="level-grid">
              {listaNiveles.map((numNivel) => (
                <button
                  key={numNivel}
                  type="button"
                  className={`level-grid-item ${selectedLevel === numNivel ? 'active' : ''}`}
                  onClick={() => setSelectedLevel(numNivel)}
                >
                  <span className="level-number">{numNivel}</span>
                  {selectedLevel === numNivel && <div className="level-badge">📌</div>}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mode-switch" role="group" aria-label="Modo de control">
          <button
            className={inputMode === 'camera' ? 'mode-button mode-button-active' : 'mode-button'}
            type="button"
            onClick={() => onModeChange('camera')}
          >
            <Camera size={20} />
            Camara
          </button>
          <button
            className={inputMode === 'mouse' ? 'mode-button mode-button-active' : 'mode-button'}
            type="button"
            onClick={() => onModeChange('mouse')}
          >
            <MousePointer2 size={20} />
            Mouse
          </button>
        </div>

        {/* --- BOTÓN DE INICIO (Con tus clases CSS originales y bloqueo estricto) --- */}
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            onStart({ 
              playerName: playerName, 
              startLevel: selectedLevel, 
              difficulty: selectedDifficulty 
            });
          }}
          disabled={!playerName.trim()}
        >
          <Play size={22} />
          INICIAR JUEGO
        </button>

        <RankingBoard rankings={rankings} activeMode={inputMode} onClear={onClearRanking} />
      </div>
    </section>
  );
}