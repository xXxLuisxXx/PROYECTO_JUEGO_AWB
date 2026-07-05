import { Camera, MousePointer2, Play } from 'lucide-react';
import RankingBoard from './RankingBoard.jsx';

export default function StartScreen({ inputMode, onModeChange, onStart, rankings, onClearRanking }) {
  return (
    <section className="screen-layer start-screen">
      <div className="brand-block">
        <p className="eyebrow">Camara oculta o mouse</p>
        <h1>FRUIT NINJA CAM</h1>
        <p className="start-copy">
          Corta frutas con tu dedo indice sin mostrar tu rostro, o cambia a mouse para jugar sin camara.
        </p>
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
        <button className="primary-button" type="button" onClick={onStart}>
          <Play size={22} />
          INICIAR JUEGO
        </button>
        <RankingBoard rankings={rankings} activeMode={inputMode} onClear={onClearRanking} />
      </div>
    </section>
  );
}
