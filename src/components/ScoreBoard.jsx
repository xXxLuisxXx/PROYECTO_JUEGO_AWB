import { Clock3, Heart, Trophy } from 'lucide-react';

function formatElapsedTime(elapsedMs = 0) {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function ScoreBoard({ score, lives, record, levelStats, playerName }) {
  return (
    <header className="score-board">
      <div className="score-item player-item">
        <span>JUGADOR</span>
        <strong>{playerName || 'Jugador'}</strong>
      </div>

      <div className="score-item level-item">
        <span>NIVEL</span>
        <strong>{levelStats.level}</strong>
      </div>

      <div className="score-item fruit-item">
        <span>FRUTAS</span>
        <strong>
          {levelStats.fruits} / {levelStats.target}
        </strong>
      </div>

      <div className="score-item points-item">
        <span>PUNTOS</span>
        <strong>{String(score).padStart(4, '0')}</strong>
      </div>

      <div className="score-item timer-item">
        <Clock3 size={18} aria-hidden="true" />
        <span>TIEMPO</span>
        <strong>{formatElapsedTime(levelStats.elapsedMs)}</strong>
      </div>

      <div className="life-row" aria-label={`${lives} vidas restantes`}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Heart
            key={index}
            size={28}
            fill={index < lives ? 'currentColor' : 'none'}
            className={index < lives ? 'life-on' : 'life-off'}
          />
        ))}
      </div>

      <div className="score-item record-item">
        <Trophy size={22} />
        <span>RECORD</span>
        <strong>{String(record).padStart(4, '0')}</strong>
      </div>

      <div className="score-item combo-item">
        <span>COMBO</span>
        <strong>x{levelStats.combo || 0}</strong>
      </div>

      <div className="score-item multiplier-item">
        <span>MULTI</span>
        <strong>x{levelStats.multiplier || 1}</strong>
      </div>

      <div className="score-item fps-item">
        <span>FPS</span>
        <strong>{levelStats.fps || 0}</strong>
      </div>
    </header>
  );
}
