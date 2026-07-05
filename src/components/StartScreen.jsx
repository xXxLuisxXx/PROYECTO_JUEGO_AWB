import { Play } from 'lucide-react';

export default function StartScreen({ onStart }) {
  return (
    <section className="screen-layer start-screen">
      <div className="brand-block">
        <p className="eyebrow">Control por camara</p>
        <h1>FRUIT NINJA CAM</h1>
        <p className="start-copy">
          Mueve tu dedo indice frente a la camara y corta las frutas antes de que caigan.
        </p>
        <button className="primary-button" type="button" onClick={onStart}>
          <Play size={22} />
          INICIAR JUEGO
        </button>
      </div>
    </section>
  );
}
