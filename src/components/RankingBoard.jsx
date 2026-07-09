import { Search, Trash2 } from 'lucide-react';
import { useState } from 'react';

function formatDate(value) {
  if (!value) {
    return '--';
  }

  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getPosition(index) {
  return `${index + 1}.`;
}

export default function RankingBoard({ rankings = [], onClear, stats }) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const scores = rankings.filter((entry) => entry.name.toLocaleLowerCase().includes(normalizedQuery));

  return (
    <section className="ranking-board ranking-board-expanded" aria-label="Ranking global local">
      <div className="ranking-title">
        <span>RANKING</span>
        <strong>Global local</strong>
      </div>

      <label className="ranking-search">
        <Search size={18} />
        <input
          type="search"
          placeholder="Buscar jugador"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {scores.length > 0 ? (
        <ol className="ranking-list">
          {scores.map((entry, index) => (
            <li key={`${entry.name}-${entry.date}`}>
              <span className="ranking-position">{getPosition(index)}</span>
              <div className="ranking-player">
                <strong>{entry.name || 'Jugador'}</strong>
                <span>
                  Nivel {entry.level || 1} | {entry.fruitsSliced || 0} frutas | {entry.bombsHit || 0} bombas | {formatDate(entry.date)}
                </span>
              </div>
              <strong className="ranking-score">{entry.score} pts</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className="ranking-empty">Sin jugadores todavía</p>
      )}

      {stats && (
        <div className="ranking-stats">
          <span>Partidas: {stats.gamesPlayed}</span>
          <span>Frutas: {stats.fruitsSliced}</span>
          <span>Bombas: {stats.bombsHit}</span>
          <span>Nivel max: {stats.maxLevelReached}</span>
        </div>
      )}

      <button
        className="clear-ranking-button"
        type="button"
        onClick={() => onClear?.()}
        disabled={rankings.length === 0}
      >
        <Trash2 size={18} />
        Borrar Ranking
      </button>
    </section>
  );
}
