import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const MODEL_URL = '/mediapipe/models/hand_landmarker.task';
const WASM_URL = '/mediapipe/wasm';
const DETECTION_INTERVAL_MS = 50;
const POINT_HOLD_MS = 220;

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
  const lastDetectionTimeRef = useRef(0);
  const lastHandSeenTimeRef = useRef(0);
  const hasHandRef = useRef(false);
  const handPointRef = useRef(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [hasSeenHand, setHasSeenHand] = useState(false);
  const [isHandVisible, setIsHandVisible] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      if (!active) {
        return;
      }

      try {
        setError('');
        setHasSeenHand(false);
        setIsHandVisible(false);
        hasHandRef.current = false;
        handPointRef.current = null;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 424, max: 640 },
            height: { ideal: 240, max: 480 },
            frameRate: { ideal: 24, max: 24 },
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
            landmarkerRef.current = await createHandLandmarker(vision, 'CPU');
          } catch (cpuError) {
            console.warn('MediaPipe CPU no disponible, usando GPU.', cpuError);
            landmarkerRef.current = await createHandLandmarker(vision, 'GPU');
          }
        }

        const detect = () => {
          if (cancelled || !videoRef.current || !landmarkerRef.current) {
            return;
          }

          const currentVideo = videoRef.current;
          const shouldDetect = performance.now() - lastDetectionTimeRef.current >= DETECTION_INTERVAL_MS;

          if (
            shouldDetect
            && currentVideo.readyState >= 2
            && currentVideo.videoWidth > 0
            && currentVideo.currentTime !== lastVideoTimeRef.current
          ) {
            lastDetectionTimeRef.current = performance.now();
            lastVideoTimeRef.current = currentVideo.currentTime;
            const now = performance.now();
            let result;

            try {
              result = landmarkerRef.current.detectForVideo(currentVideo, now);
            } catch {
              frameRef.current = requestAnimationFrame(detect);
              return;
            }

            const indexTip = result.landmarks?.[0]?.[8];

            if (indexTip) {
              lastHandSeenTimeRef.current = now;
              handPointRef.current = {
                x: 1 - indexTip.x,
                y: indexTip.y,
              };
              if (!hasHandRef.current) {
                hasHandRef.current = true;
                setIsHandVisible(true);
              }
              setHasSeenHand(true);
            } else if (now - lastHandSeenTimeRef.current > POINT_HOLD_MS) {
              handPointRef.current = null;
              if (hasHandRef.current) {
                hasHandRef.current = false;
                setIsHandVisible(false);
              }
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
      hasHandRef.current = false;
      setHasSeenHand(false);
      setIsHandVisible(false);
      setIsCameraReady(false);
    };
  }, [active, videoRef]);

  return { handPointRef, isCameraReady, hasSeenHand, isHandVisible, error };
}
