import { Heart, Trophy } from 'lucide-react';

export default function ScoreBoard({ score, lives, record, levelStats, showFps = false }) {
  return (
    <header className="score-board">
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

      <div className="score-item">
        <span>PUNTOS</span>
        <strong>{String(score).padStart(4, '0')}</strong>
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

      {showFps && (
        <div className="score-item fps-item">
          <span>FPS</span>
          <strong>{levelStats.fps}</strong>
        </div>
      )}
    </header>
  );
}
