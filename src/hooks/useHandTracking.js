import { useCallback, useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { hasSecureCameraContext, isIOSDevice, isMobileDevice } from '../utils/device.js';

const MOBILE_DETECTION_INTERVAL_MS = 30;
const DESKTOP_DETECTION_INTERVAL_MS = 20;
const POINT_STALE_MS = 320;
const HAND_VISIBLE_HOLD_MS = 520;
const DEAD_ZONE = 0.0015;
const MAX_POINT_STEP = 0.55;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampPoint(point) {
  return {
    x: clamp(point.x, 0, 1),
    y: clamp(point.y, 0, 1),
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

function smoothPoint(previousPoint, detectedPoint, previousVelocity) {
  if (!previousPoint) {
    return { point: detectedPoint, velocity: { x: 0, y: 0 } };
  }

  const limitedPoint = limitPointStep(previousPoint, detectedPoint);
  const dx = limitedPoint.x - previousPoint.x;
  const dy = limitedPoint.y - previousPoint.y;
  const distance = Math.hypot(dx, dy);

  // El filtro es estable al quedarse quieto y casi directo durante movimientos rápidos.
  const response = distance < DEAD_ZONE ? 0 : clamp(0.62 + distance * 4.8, 0.62, 0.98);
  const nextPoint = response === 0
    ? previousPoint
    : clampPoint({
      x: previousPoint.x + dx * response,
      y: previousPoint.y + dy * response,
    });

  return {
    point: nextPoint,
    velocity: {
      x: (nextPoint.x - previousPoint.x) * 0.82 + (previousVelocity?.x || 0) * 0.18,
      y: (nextPoint.y - previousPoint.y) * 0.82 + (previousVelocity?.y || 0) * 0.18,
    },
  };
}

function getIndexPoint(landmarks) {
  const indexTip = landmarks?.[8];
  const indexDip = landmarks?.[7];
  const indexPip = landmarks?.[6];

  if (!indexTip) {
    return null;
  }

  return clampPoint({
    x: 1 - (indexTip.x * 0.9 + (indexDip?.x ?? indexTip.x) * 0.07 + (indexPip?.x ?? indexTip.x) * 0.03),
    y: indexTip.y * 0.9 + (indexDip?.y ?? indexTip.y) * 0.07 + (indexPip?.y ?? indexTip.y) * 0.03,
  });
}

function resolvePublicAsset(path) {
  return new URL(`${import.meta.env.BASE_URL}${path}`, document.baseURI).toString();
}

async function createHandLandmarker(vision, delegate) {
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: resolvePublicAsset('mediapipe/models/hand_landmarker.task'),
      delegate,
    },
    runningMode: 'VIDEO',
    numHands: 1,
    minHandDetectionConfidence: 0.34,
    minHandPresenceConfidence: 0.34,
    minTrackingConfidence: 0.32,
  });
}

function getCameraConstraints(mobile) {
  return {
    video: {
      facingMode: { ideal: 'user' },
      width: { ideal: mobile ? 480 : 640, max: mobile ? 640 : 960 },
      height: { ideal: mobile ? 360 : 480, max: mobile ? 480 : 720 },
      frameRate: { ideal: 30, max: 30 },
    },
    audio: false,
  };
}

async function requestCameraStream(mobile) {
  try {
    return await navigator.mediaDevices.getUserMedia(getCameraConstraints(mobile));
  } catch (cameraError) {
    if (cameraError?.name !== 'OverconstrainedError') {
      throw cameraError;
    }

    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'user' } },
      audio: false,
    });
  }
}

function getCameraErrorMessage(setupError) {
  if (setupError?.name === 'SecurityError' || !hasSecureCameraContext()) {
    return 'La cámara requiere HTTPS. Abre la versión publicada con https://; una dirección IP local con http:// está bloqueada por el navegador.';
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return 'Este navegador no ofrece acceso a la cámara. Actualízalo y abre el juego mediante HTTPS.';
  }

  if (setupError?.name === 'NotAllowedError') {
    return 'El permiso de cámara está bloqueado. Habilítalo en los ajustes del sitio y pulsa Reintentar.';
  }

  if (setupError?.name === 'NotFoundError' || setupError?.name === 'DevicesNotFoundError') {
    return 'No se encontró una cámara disponible en este dispositivo.';
  }

  if (setupError?.name === 'NotReadableError' || setupError?.name === 'TrackStartError') {
    return 'Otra aplicación está usando la cámara. Ciérrala y pulsa Reintentar.';
  }

  if (setupError?.name === 'AbortError') {
    return 'La cámara se interrumpió al cambiar de aplicación u orientación. Pulsa Reintentar.';
  }

  return 'No se pudo iniciar la cámara o el detector de manos. Pulsa Reintentar.';
}

export default function useHandTracking(videoRef, active) {
  const landmarkerRef = useRef(null);
  const landmarkerPromiseRef = useRef(null);
  const visionRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(0);
  const frameTypeRef = useRef('raf');
  const lastVideoTimeRef = useRef(-1);
  const lastDetectionTimeRef = useRef(0);
  const lastHandSeenTimeRef = useRef(0);
  const hasHandRef = useRef(false);
  const hasSeenHandRef = useRef(false);
  const smoothedPointRef = useRef(null);
  const velocityRef = useRef({ x: 0, y: 0 });
  const handPointRef = useRef(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [hasSeenHand, setHasSeenHand] = useState(false);
  const [isHandVisible, setIsHandVisible] = useState(false);
  const [error, setError] = useState('');
  const [restartToken, setRestartToken] = useState(0);

  const retryCamera = useCallback(() => {
    setError('');
    setRestartToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let recovering = false;
    let consecutiveDetectionErrors = 0;
    const mobile = isMobileDevice();
    const detectionInterval = mobile ? MOBILE_DETECTION_INTERVAL_MS : DESKTOP_DETECTION_INTERVAL_MS;

    function resetTrackingState() {
      lastVideoTimeRef.current = -1;
      lastDetectionTimeRef.current = 0;
      lastHandSeenTimeRef.current = 0;
      hasHandRef.current = false;
      hasSeenHandRef.current = false;
      smoothedPointRef.current = null;
      velocityRef.current = { x: 0, y: 0 };
      handPointRef.current = null;
      setHasSeenHand(false);
      setIsHandVisible(false);
    }

    function stopStream() {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }

    function cancelFrame() {
      const video = videoRef.current;
      if (frameTypeRef.current === 'video' && video?.cancelVideoFrameCallback) {
        video.cancelVideoFrameCallback(frameRef.current);
      } else {
        cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = 0;
    }

    async function ensureLandmarker(preferredDelegate) {
      if (landmarkerRef.current) {
        return landmarkerRef.current;
      }

      if (landmarkerPromiseRef.current) {
        return landmarkerPromiseRef.current;
      }

      landmarkerPromiseRef.current = (async () => {
        if (!visionRef.current) {
          visionRef.current = await FilesetResolver.forVisionTasks(resolvePublicAsset('mediapipe/wasm'));
        }

        try {
          landmarkerRef.current = await createHandLandmarker(visionRef.current, preferredDelegate);
        } catch (delegateError) {
          if (preferredDelegate === 'CPU') {
            throw delegateError;
          }
          console.warn('MediaPipe GPU no disponible, usando CPU.', delegateError);
          landmarkerRef.current = await createHandLandmarker(visionRef.current, 'CPU');
        }

        return landmarkerRef.current;
      })().finally(() => {
        landmarkerPromiseRef.current = null;
      });

      return landmarkerPromiseRef.current;
    }

    async function recoverDetectorOnCpu() {
      if (recovering || cancelled) {
        return;
      }

      recovering = true;
      try {
        landmarkerRef.current?.close?.();
        landmarkerRef.current = null;
        await ensureLandmarker('CPU');
        consecutiveDetectionErrors = 0;
      } catch (recoveryError) {
        console.error('No se pudo recuperar MediaPipe en CPU.', recoveryError);
        if (!cancelled) {
          setError('El detector de manos se detuvo. Pulsa Reintentar para reiniciar la cámara.');
        }
      } finally {
        recovering = false;
      }
    }

    function scheduleFrame(callback) {
      const video = videoRef.current;
      if (video?.requestVideoFrameCallback) {
        frameTypeRef.current = 'video';
        frameRef.current = video.requestVideoFrameCallback(callback);
      } else {
        frameTypeRef.current = 'raf';
        frameRef.current = requestAnimationFrame(callback);
      }
    }

    function detect(now, metadata) {
      if (cancelled) {
        return;
      }

      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      const videoTime = metadata?.mediaTime ?? video?.currentTime ?? -1;
      const shouldDetect = now - lastDetectionTimeRef.current >= detectionInterval;

      if (
        video
        && landmarker
        && shouldDetect
        && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        && video.videoWidth > 0
        && videoTime !== lastVideoTimeRef.current
      ) {
        lastDetectionTimeRef.current = now;
        lastVideoTimeRef.current = videoTime;

        try {
          const result = landmarker.detectForVideo(video, now);
          consecutiveDetectionErrors = 0;
          // El video está oculto: todo el encuadre de cámara se mapea al Canvas,
          // evitando zonas recortadas que dejaban el corte pegado en móviles verticales.
          const detectedPoint = getIndexPoint(result.landmarks?.[0]);

          if (detectedPoint) {
            const smoothed = smoothPoint(smoothedPointRef.current, detectedPoint, velocityRef.current);
            lastHandSeenTimeRef.current = now;
            smoothedPointRef.current = smoothed.point;
            velocityRef.current = smoothed.velocity;
            handPointRef.current = smoothed.point;

            if (!hasHandRef.current) {
              hasHandRef.current = true;
              setIsHandVisible(true);
            }
            if (!hasSeenHandRef.current) {
              hasSeenHandRef.current = true;
              setHasSeenHand(true);
            }
          } else {
            const staleTime = now - lastHandSeenTimeRef.current;
            if (smoothedPointRef.current && staleTime <= POINT_STALE_MS) {
              const predictionFrames = Math.min(0.9, staleTime / detectionInterval);
              const predictionStrength = 0.55 * Math.max(0, 1 - staleTime / POINT_STALE_MS);
              handPointRef.current = clampPoint({
                x: smoothedPointRef.current.x + velocityRef.current.x * predictionFrames * predictionStrength,
                y: smoothedPointRef.current.y + velocityRef.current.y * predictionFrames * predictionStrength,
              });
            } else {
              handPointRef.current = null;
              smoothedPointRef.current = null;
              velocityRef.current = { x: 0, y: 0 };
            }

            if (now - lastHandSeenTimeRef.current > HAND_VISIBLE_HOLD_MS && hasHandRef.current) {
              hasHandRef.current = false;
              setIsHandVisible(false);
            }
          }
        } catch (detectionError) {
          consecutiveDetectionErrors += 1;
          if (consecutiveDetectionErrors >= 3) {
            recoverDetectorOnCpu();
          }
        }
      }

      scheduleFrame(detect);
    }

    async function setup() {
      if (!active) {
        stopStream();
        resetTrackingState();
        setIsCameraReady(false);
        return;
      }

      try {
        setError('');
        setIsCameraReady(false);
        resetTrackingState();

        if (!hasSecureCameraContext()) {
          const securityError = new Error('Camera requires a secure context.');
          securityError.name = 'SecurityError';
          throw securityError;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new TypeError('getUserMedia is unavailable.');
        }

        const preferredDelegate = isIOSDevice() ? 'CPU' : 'GPU';
        const detectorPromise = ensureLandmarker(preferredDelegate);
        const stream = await requestCameraStream(mobile);

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        stream.getVideoTracks().forEach((track) => {
          try {
            track.contentHint = 'motion';
          } catch {
            // Algunos navegadores exponen contentHint como solo lectura.
          }
          track.addEventListener('ended', () => {
            if (!cancelled) {
              setIsCameraReady(false);
              setError('La cámara se desconectó. Pulsa Reintentar para continuar.');
            }
          }, { once: true });
        });

        const video = videoRef.current;
        if (!video) {
          throw new Error('Video element is unavailable.');
        }

        video.playsInline = true;
        video.muted = true;
        video.srcObject = stream;
        await video.play();
        setIsCameraReady(true);
        await detectorPromise;

        if (!cancelled) {
          scheduleFrame(detect);
        }
      } catch (setupError) {
        console.error('Error al iniciar cámara o MediaPipe:', setupError);
        stopStream();
        setIsCameraReady(false);
        if (!cancelled) {
          setError(getCameraErrorMessage(setupError));
        }
      }
    }

    function resumeVideoAfterInterruption() {
      const video = videoRef.current;
      if (!cancelled && document.visibilityState === 'visible' && video?.srcObject && video.paused) {
        video.play().catch(() => {
          setError('La cámara se pausó al cambiar de aplicación. Pulsa Reintentar.');
        });
      }
    }

    document.addEventListener('visibilitychange', resumeVideoAfterInterruption);
    window.addEventListener('orientationchange', resumeVideoAfterInterruption);
    setup();

    return () => {
      cancelled = true;
      cancelFrame();
      stopStream();
      resetTrackingState();
      setIsCameraReady(false);
      document.removeEventListener('visibilitychange', resumeVideoAfterInterruption);
      window.removeEventListener('orientationchange', resumeVideoAfterInterruption);
    };
  }, [active, restartToken, videoRef]);

  return {
    handPointRef,
    isCameraReady,
    hasSeenHand,
    isHandVisible,
    error,
    retryCamera,
  };
}
