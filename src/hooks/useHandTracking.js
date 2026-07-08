import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const MODEL_URL = '/mediapipe/models/hand_landmarker.task';
const WASM_URL = '/mediapipe/wasm';
const DETECTION_INTERVAL_MS = 42;
const POINT_STALE_MS = 240;
const HAND_VISIBLE_HOLD_MS = 650;
const SMOOTHING = 0.68;
const DEAD_ZONE = 0.004;
const MAX_POINT_STEP = 0.32;

function clampPoint(point) {
  return {
    x: Math.min(1, Math.max(0, point.x)),
    y: Math.min(1, Math.max(0, point.y)),
  };
}

function limitPointStep(previousPoint, detectedPoint) {
  if (!previousPoint) {
    return detectedPoint;
  }

  const dx = detectedPoint.x - previousPoint.x;
  const dy = detectedPoint.y - previousPoint.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= MAX_POINT_STEP) {
    return detectedPoint;
  }

  const scale = MAX_POINT_STEP / distance;
  return {
    x: previousPoint.x + dx * scale,
    y: previousPoint.y + dy * scale,
  };
}

function getStableIndexPoint(landmarks) {
  const indexTip = landmarks?.[8];
  const indexDip = landmarks?.[7];
  const indexPip = landmarks?.[6];

  if (!indexTip) {
    return null;
  }

  const x = indexTip.x * 0.72 + (indexDip?.x ?? indexTip.x) * 0.18 + (indexPip?.x ?? indexTip.x) * 0.1;
  const y = indexTip.y * 0.72 + (indexDip?.y ?? indexTip.y) * 0.18 + (indexPip?.y ?? indexTip.y) * 0.1;
  return clampPoint({ x: 1 - x, y });
}

async function createHandLandmarker(vision, delegate) {
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate,
    },
    runningMode: 'VIDEO',
    numHands: 1,
    minHandDetectionConfidence: 0.42,
    minHandPresenceConfidence: 0.42,
    minTrackingConfidence: 0.38,
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
  const hasSeenHandRef = useRef(false);
  const smoothedPointRef = useRef(null);
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
        hasSeenHandRef.current = false;
        smoothedPointRef.current = null;
        handPointRef.current = null;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320, max: 360 },
            height: { ideal: 240, max: 270 },
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
        video.playsInline = true;
        video.muted = true;
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

            const detectedPoint = getStableIndexPoint(result.landmarks?.[0]);

            if (detectedPoint) {
              const limitedPoint = limitPointStep(smoothedPointRef.current, detectedPoint);
              const previousPoint = smoothedPointRef.current || limitedPoint;
              const distance = Math.hypot(limitedPoint.x - previousPoint.x, limitedPoint.y - previousPoint.y);
              const nextPoint = {
                x: distance < DEAD_ZONE
                  ? previousPoint.x
                  : previousPoint.x + (limitedPoint.x - previousPoint.x) * SMOOTHING,
                y: distance < DEAD_ZONE
                  ? previousPoint.y
                  : previousPoint.y + (limitedPoint.y - previousPoint.y) * SMOOTHING,
              };

              lastHandSeenTimeRef.current = now;
              smoothedPointRef.current = nextPoint;
              handPointRef.current = nextPoint;

              if (!hasHandRef.current) {
                hasHandRef.current = true;
                setIsHandVisible(true);
              }
              if (!hasSeenHandRef.current) {
                hasSeenHandRef.current = true;
                setHasSeenHand(true);
              }
            } else if (now - lastHandSeenTimeRef.current > POINT_STALE_MS) {
              handPointRef.current = null;
              smoothedPointRef.current = null;
            }

            if (!detectedPoint && now - lastHandSeenTimeRef.current > HAND_VISIBLE_HOLD_MS) {
              if (hasHandRef.current) {
                hasHandRef.current = false;
                setIsHandVisible(false);
              }
            }
          }

          const staleTime = performance.now() - lastHandSeenTimeRef.current;
          if (handPointRef.current && staleTime > POINT_STALE_MS) {
            handPointRef.current = null;
            smoothedPointRef.current = null;
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
      hasSeenHandRef.current = false;
      smoothedPointRef.current = null;
      setHasSeenHand(false);
      setIsHandVisible(false);
      setIsCameraReady(false);
    };
  }, [active, videoRef]);

  return { handPointRef, isCameraReady, hasSeenHand, isHandVisible, error };
}
