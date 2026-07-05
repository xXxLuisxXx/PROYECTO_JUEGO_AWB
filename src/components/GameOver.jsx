import { RotateCcw } from 'lucide-react';

export default function GameOver({ score, record, totalFruits = 0, type = 'gameover', onRestart }) {
  const isVictory = type === 'victory';

  return (
    <section className="screen-layer game-over-screen">
      <div className="game-over-panel">
        <p className="eyebrow">{isVictory ? 'Nivel 15 completado' : 'Fin de partida'}</p>
        <h1>{isVictory ? 'VICTORIA' : 'GAME OVER'}</h1>
        <div className="final-stats">
          <span>PUNTOS: {String(score).padStart(4, '0')}</span>
          <span>FRUTAS: {totalFruits}</span>
          <span>RECORD: {String(record).padStart(4, '0')}</span>
        </div>
        <button className="primary-button" type="button" onClick={onRestart}>
          <RotateCcw size={22} />
          JUGAR DE NUEVO
        </button>
      </div>
    </section>
  );
}
