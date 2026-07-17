# Informe técnico — Fruit Ninja Cam

Fecha de validación: 14 de julio de 2026  
Proyecto analizado: `PROYECTO_JUEGO_AWB-main`

## Resumen del resultado

Se corrigieron los defectos de ciclo de vida que reiniciaban el juego al cambiar el estado de la mano, se redujo la latencia acumulada entre MediaPipe y la espada, se robusteció el inicio y la recuperación de la cámara, se hizo portable la carga del modelo y WASM, y se sustituyó el CSS conflictivo por una interfaz responsive con safe areas y viewport dinámico.

La lógica de niveles, puntuación, combos, vidas, frutas, bombas, audio, ranking y victoria se conserva.

## Ajustes posteriores de jugabilidad y privacidad

La progresión común a cámara y táctil/mouse quedó en 7, 9, 11, 13, 15, 17, 19, 21, 23 y 25 frutas por nivel. El nivel 10 se limita a velocidad 1,26, cuatro objetos simultáneos, 10 % de bombas y 680 ms entre apariciones.

Se eliminó completamente la cámara lenta de 420 ms que se activaba con combos de cinco cortes. En teléfonos también se redujo la cantidad de partículas para evitar saltos al cortar.

El video de la cámara tiene opacidad cero incluso mientras está activo. MediaPipe continúa procesando sus fotogramas, pero la cara o el entorno del jugador no se muestran. Como el video ya no se dibuja con `object-fit: cover`, el seguimiento usa todo el encuadre normalizado y no recorta los lados en teléfonos verticales. Las pérdidas breves de detección se mantienen durante 320 ms con predicción limitada.

## 1. Problemas encontrados y causas

### Cámara móvil

1. **`getUserMedia()` bloqueado al abrir el servidor por una IP con HTTP.** Los navegadores móviles exigen un contexto seguro. `http://localhost` es una excepción local, pero `http://192.168.x.x` no lo es.
2. **Rutas absolutas al modelo y WASM de MediaPipe.** Las rutas `/mediapipe/...` fallaban con un error 404 cuando la aplicación se publicaba dentro de una subcarpeta.
3. **Reinicio accidental del loop del juego.** `GameCanvas` dependía de `inputStatus`. Cuando MediaPipe pasaba de “Activando cámara” a “Pon tu mano” o cambiaba la visibilidad de la mano, React destruía y recreaba el loop completo, vaciando frutas, efectos y contadores internos.
4. **Restricciones de cámara sin degradación progresiva.** Una cámara que no aceptara resolución o FPS solicitados terminaba el inicio en vez de reintentarse con restricciones básicas.
5. **Delegado gráfico frágil.** Se intentaba GPU en todos los dispositivos y solo existía fallback durante la creación. No había recuperación si el delegado fallaba durante la inferencia.
6. **Sin recuperación clara tras interrupciones.** Cambiar de aplicación, orientación o bloquear la pantalla podía pausar/finalizar el track sin una acción de reintento útil.
7. **Estado de cámara sin información visible.** El video activo mantenía `opacity: 0`, por lo que el usuario no tenía retroalimentación visual de encuadre.

### Latencia del corte

1. **Suavizado duplicado.** El punto pasaba por un filtro lento en el hook y después por otro filtro en la espada.
2. **El punto no priorizaba suficientemente la punta del índice.** Se mezclaba un 28 % de articulaciones anteriores, haciendo que el cursor quedara detrás del dedo.
3. **Límite de paso y respuesta demasiado conservadores.** Los desplazamientos rápidos se recortaban y el factor mínimo de respuesta era bajo.
4. **Colisión exigente para cortes cortos.** Los segmentos inferiores a 8 px se ignoraban, generando fallos perceptibles en pantallas pequeñas.

### Rendimiento y responsive

1. **CSS de 1.111 líneas con reglas duplicadas y breakpoints contradictorios.** Varias definiciones posteriores anulaban ajustes móviles anteriores.
2. **Uso rígido de `100vh` y altura mínima.** Las barras del navegador móvil y las safe areas podían recortar la interfaz.
3. **HUD demasiado alto en teléfonos.** Las reglas terminaban formando múltiples filas grandes sobre el área de juego.
4. **Aleatoriedad de aparición calculada en cada frame.** El retraso aleatorio de spawn se recalculaba hasta producir una fruta.
5. **Canvas sin perfil específico de dispositivo.** La resolución interna no distinguía adecuadamente entre un teléfono táctil y escritorio.
6. **No existía un temporizador visible.** Se añadió sin convertirlo en un límite ni modificar las reglas.
7. **Ranking duplicado en la pantalla de juego inicial.** Aparecía además de su pestaña dedicada, alargando innecesariamente la pantalla.

## 2. Archivos modificados

- `src/hooks/useHandTracking.js`
- `src/components/GameCanvas.jsx`
- `src/components/CameraTracker.jsx`
- `src/components/ScoreBoard.jsx`
- `src/components/StartScreen.jsx`
- `src/services/sword.js`
- `src/services/collision.js`
- `src/services/fruitGenerator.js`
- `src/utils/device.js` (nuevo)
- `src/App.jsx`
- `src/App.css`
- `vite.config.js`
- `index.html`
- `README.md`

## 3. Cambios realizados y motivo

### Seguimiento y cámara

- El índice usa 90 % de la punta y un filtro adaptativo: estable en reposo y con respuesta de hasta 98 % en movimientos rápidos.
- La espada responde al 92 % del objetivo por actualización, eliminando gran parte de la segunda capa de retraso.
- Se usa `requestVideoFrameCallback` cuando está disponible para sincronizar inferencia y fotogramas reales; se conserva `requestAnimationFrame` como fallback.
- Se evita inferir dos veces el mismo fotograma.
- Los parámetros de cámara se adaptan a móvil/escritorio y reintentan restricciones básicas ante `OverconstrainedError`.
- iOS prefiere CPU por compatibilidad. Otros dispositivos prueban GPU y caen a CPU si falla; tres errores seguidos durante inferencia también activan recuperación en CPU.
- Se manejan errores de contexto seguro, permisos, cámara inexistente, cámara ocupada e interrupción.
- Se añadió botón **Reintentar**, reanudación después de visibilidad/orientación y detección de finalización del track.
- Las coordenadas se corrigen para coincidir con el recorte real de `object-fit: cover` y el espejo de la cámara frontal.
- El modelo y WASM se resuelven desde `BASE_URL`; Vite usa base relativa para despliegues en subcarpetas.

### Loop, colisiones y Canvas

- `inputStatus` pasó a un `ref`; cambiar el estado de la mano ya no reinicia el loop.
- El retraso de spawn se elige una sola vez por aparición.
- `ResizeObserver`, `visualViewport` y `resize` mantienen el Canvas sincronizado con cambios de barra u orientación.
- En móvil el DPR se limita a 1,1 para reducir carga de relleno.
- El corte mínimo bajó de 8 a 4 px y la tolerancia aumentó 2 px, mejorando cortes rápidos sin permitir el corte por un punto inmóvil.
- El tiempo se acumula solo mientras la partida está activa y lista; pausa y espera de cámara no lo incrementan.

### Interfaz móvil

- Se reescribió el CSS en una sola jerarquía coherente.
- Se incorporaron `100dvh`, safe areas, `overscroll-behavior`, controles de al menos 44 px y layouts vertical/horizontal.
- El HUD presenta diez indicadores visibles en una cuadrícula de dos filas en teléfonos.
- Se añadieron estado de mano, temporizador y mensajes de cámara legibles.
- Inicio, pausa, Game Over, victoria, ranking y acciones finales se adaptan y permiten scroll interno cuando realmente es necesario.
- El modo tradicional ahora se etiqueta **Táctil / mouse**, porque los eventos Pointer ya soportaban ambos.

## 4. Mejoras de rendimiento obtenidas

- CSS de producción: **17,00 KB → 12,54 KB** (aprox. 26 % menos); gzip: **4,24 KB → 3,57 KB**.
- El límite DPR móvil de 1,2 a 1,1 reduce aproximadamente **16 %** la cantidad máxima de píxeles del Canvas por frame.
- La inferencia se agenda con fotogramas nuevos de video y deja de mantener un callback visual de 60 Hz cuando el video entrega 30 FPS.
- Se eliminó el cálculo aleatorio de spawn repetido en cada frame.
- Se mantienen límites estrictos de partículas, mitades, anillos, textos y caché de sprites.

No se declara una cifra de FPS o latencia en milisegundos porque requeriría medir hardware móvil real con una mano frente a la cámara.

## 5. Mejoras en la experiencia móvil

- Sin overflow horizontal en 390×844 ni 844×390.
- Botón táctil más pequeño medido: 44 px.
- Canvas medido a 390×844, exactamente igual al viewport probado.
- HUD completo medido en 129 px de altura a 390 px de ancho.
- Controles inferiores respetan safe areas.
- Pantalla inicial completa sin scroll a 390×844 y 844×390 en la configuración probada.
- Game Over y ranking permanecen accesibles mediante scroll interno en pantallas pequeñas.

## 6. Por qué fallaba la cámara en teléfonos y cómo se solucionó

Había más de una causa. La externa era el protocolo: abrir el servidor Vite mediante la IP local usaba HTTP y el navegador bloqueaba la API de cámara. Esto no puede eludirse con JavaScript; el sitio debe publicarse con un certificado HTTPS válido. El proyecto ahora detecta esa situación y explica exactamente cómo resolverla.

Las causas internas eran las rutas de MediaPipe incompatibles con subcarpetas, restricciones de video sin fallback, preferencia GPU poco segura para iOS, falta de recuperación y —sobre todo— la dependencia `inputStatus`, que reiniciaba el juego cada vez que se detectaba o perdía la mano. Todas fueron corregidas. El README documenta el requisito HTTPS y la compilación queda lista para publicarse en la raíz o en una subcarpeta.

## 7. Validación realizada

- `npm ci`: 68 paquetes instalados, 0 vulnerabilidades reportadas.
- `npm run build`: correcto, 1.592 módulos transformados.
- `dist/mediapipe`: 7 archivos presentes, incluido el modelo y los runtimes WASM.
- Prueba local de cámara: video listo a 640×480 y MediaPipe en estado “Buscando mano”, sin errores de aplicación.
- Modo tradicional: inicio correcto y Canvas activo.
- Pruebas visuales: 1280×720, 390×844 y 844×390.
- Pruebas de colisión: impacto, movimiento insuficiente y segmento lejano verificados.
- Consola: sin errores JavaScript; solo advertencias internas informativas de MediaPipe/WebGL.

### Límite de validación

No se contó con un teléfono Android/iPhone físico ni una mano real frente a esos dispositivos. Por ello, no se afirma una certificación de hardware para Chrome Android, Samsung Internet o Safari iOS. La inicialización, compatibilidad de código, fallback y layout sí fueron comprobados; antes de producción debe completarse la matriz física indicada abajo.

## 8. Recomendaciones futuras

1. Probar con al menos un Android de gama media, Samsung Internet y un iPhone real sobre el mismo despliegue HTTPS.
2. Registrar tiempo de inferencia, FPS y pérdidas de mano por modelo/dispositivo mediante métricas opcionales sin imágenes.
3. Evaluar un modelo de mano más ligero si los teléfonos objetivo no sostienen 24–30 inferencias por segundo.
4. Mover la inferencia a Worker/OffscreenCanvas cuando MediaPipe Tasks permita un flujo estable para todos los navegadores objetivo.
5. Añadir pruebas E2E con cámara simulada y una secuencia de video de mano autorizada.
6. Incorporar una PWA para pantalla completa, control de orientación y mejor recuperación después de suspender la aplicación.
7. Servir los assets con compresión Brotli y caché prolongada; el modelo/WASM representa la mayor parte del peso inicial.
