import { Home, Pause, Play, Volume2, VolumeX } from 'lucide-react';

export default function GameControls({ paused, soundEnabled, onPauseToggle, onSoundToggle, onHome }) {
  return (
    <div className="game-controls" aria-label="Controles del juego">
      <button
        className="icon-button"
        type="button"
        onClick={onPauseToggle}
        title={paused ? 'Continuar' : 'Pausar'}
        aria-label={paused ? 'Continuar' : 'Pausar'}
      >
        {paused ? <Play size={22} /> : <Pause size={22} />}
      </button>
      <button
        className="icon-button"
        type="button"
        onClick={onHome}
        title="Volver al inicio"
        aria-label="Volver al inicio"
      >
        <Home size={22} />
      </button>
      <button
        className="icon-button"
        type="button"
        onClick={onSoundToggle}
        title={soundEnabled ? 'Desactivar sonido' : 'Activar sonido'}
        aria-label={soundEnabled ? 'Desactivar sonido' : 'Activar sonido'}
      >
        {soundEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}
      </button>
    </div>
  );
}
