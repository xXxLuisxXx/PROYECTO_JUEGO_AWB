import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useState } from 'react';

const MODE_LABELS = {
  camera: 'Camara',
  mouse: 'Mouse',
};
const COLLAPSED_LIMIT = 3;

export default function RankingBoard({ rankings, activeMode = 'camera', onClear }) {
  const [expanded, setExpanded] = useState(false);
  const scores = rankings?.[activeMode] || [];
  const visibleScores = expanded ? scores : scores.slice(0, COLLAPSED_LIMIT);
  const canToggle = scores.length > COLLAPSED_LIMIT;

  return (
    <section
      className={expanded ? 'ranking-board ranking-board-expanded' : 'ranking-board'}
      aria-label={`Ranking ${MODE_LABELS[activeMode]}`}
    >
      <div className="ranking-title">
        <span>RANKING</span>
        <strong>{MODE_LABELS[activeMode]}</strong>
      </div>

      {scores.length > 0 ? (
      <ol style={{ padding: 0, listStyle: 'none', margin: 0 }}>
  {visibleScores.map((entry, index) => (
    <li 
      key={`${entry.name}-${entry.date}-${index}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '8px 4px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ minWidth: '20px', fontWeight: 'bold' }}>{index + 1}</span>
        <span style={{ margin: 0 }}>{entry.name || 'Jugador'}</span>
      </div>
      <strong style={{ marginLeft: 'auto' }}>{entry.score} pts</strong>
    </li>
  ))}
</ol>
      ) : (
        <p className="ranking-empty">Sin puntajes todavia</p>
      )}

      {canToggle && (
        <button className="toggle-ranking-button" type="button" onClick={() => setExpanded((current) => !current)}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          {expanded ? 'Mostrar menos' : `Ver todos (${scores.length})`}
        </button>
      )}

      <button
        className="clear-ranking-button"
        type="button"
        onClick={() => onClear?.(activeMode)}
        disabled={scores.length === 0}
      >
        <Trash2 size={18} />
        Vaciar ranking
      </button>
    </section>
  );
}
