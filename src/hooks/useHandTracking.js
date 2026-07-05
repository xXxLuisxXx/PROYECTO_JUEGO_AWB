import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const MODEL_URL = '/mediapipe/models/hand_landmarker.task';
const WASM_URL = '/mediapipe/wasm';

async function createHandLandmarker(vision, delegate) {
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate,
    },
    runningMode: 'VIDEO',
    numHands: 1,
    minHandDetectionConfidence: 0.55,
    minHandPresenceConfidence: 0.55,
    minTrackingConfidence: 0.5,
  });
}

export default function useHandTracking(videoRef, active) {
  const landmarkerRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const handPointRef = useRef(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      if (!active) {
        return;
      }

      try {
        setError('');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 60, min: 30 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        setIsCameraReady(true);

        if (!landmarkerRef.current) {
          const vision = await FilesetResolver.forVisionTasks(WASM_URL);

          try {
            landmarkerRef.current = await createHandLandmarker(vision, 'GPU');
          } catch (gpuError) {
            console.warn('MediaPipe GPU no disponible, usando CPU.', gpuError);
            landmarkerRef.current = await createHandLandmarker(vision, 'CPU');
          }
        }

        const detect = () => {
          if (cancelled || !videoRef.current || !landmarkerRef.current) {
            return;
          }

          const currentVideo = videoRef.current;
          if (currentVideo.readyState >= 2 && currentVideo.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = currentVideo.currentTime;
            const result = landmarkerRef.current.detectForVideo(currentVideo, performance.now());
            const indexTip = result.landmarks?.[0]?.[8];

            if (indexTip) {
              handPointRef.current = {
                x: 1 - indexTip.x,
                y: indexTip.y,
              };
            } else {
              handPointRef.current = null;
            }
          }

          frameRef.current = requestAnimationFrame(detect);
        };

        detect();
      } catch (setupError) {
        console.error('Error al iniciar camara o MediaPipe:', setupError);

        if (!navigator.mediaDevices?.getUserMedia) {
          setError('Este navegador no permite usar la camara en esta pagina. Abre http://localhost:5173/ en Chrome o Edge.');
          return;
        }

        if (setupError?.name === 'NotAllowedError') {
          setError('Permiso de camara bloqueado. Activalo desde el icono de candado/camara del navegador y recarga la pagina.');
          return;
        }

        if (setupError?.name === 'NotFoundError') {
          setError('No se encontro una camara disponible. Conecta o habilita una camara y recarga la pagina.');
          return;
        }

        setError('No se pudo iniciar MediaPipe. Recarga la pagina; si sigue igual, revisa la consola del navegador.');
      }
    }

    setup();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      handPointRef.current = null;
      setIsCameraReady(false);
    };
  }, [active, videoRef]);

  return { handPointRef, isCameraReady, error };
}
