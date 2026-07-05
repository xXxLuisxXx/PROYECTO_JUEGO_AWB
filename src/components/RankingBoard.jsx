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
        <ol>
          {visibleScores.map((entry, index) => (
            <li key={`${entry.score}-${entry.date}-${index}`}>
              <span>{index + 1}</span>
              <strong>{String(entry.score).padStart(4, '0')}</strong>
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
