# Fruit Ninja Cam

Juego web con React, Vite, HTML5 Canvas y MediaPipe Hands.

## Ejecutar

```bash
npm install
npm run dev
```

Si `npm` no existe en PowerShell, usa los scripts incluidos para Windows:

```bat
.\install.cmd
.\dev.cmd
```

Para compilar:

```bat
.\build.cmd
```

## Cámara en teléfonos

Los navegadores móviles solo permiten `getUserMedia()` desde un contexto seguro:

- Una publicación con `https://`.
- `http://localhost` únicamente en el mismo dispositivo.

Abrir `http://192.168.x.x:5173` desde un teléfono no habilita la cámara, aunque ambos dispositivos estén en la misma red. Para probar en un teléfono, publica `dist/` en un servidor HTTPS o utiliza un túnel HTTPS de desarrollo.

Después de abrir la versión HTTPS:

1. Pulsa **Cámara** y luego **Iniciar juego**.
2. Acepta el permiso de cámara.
3. Mantén la mano completa visible y mueve el índice frente a la cámara frontal.
4. Si se cambia el permiso desde los ajustes del navegador, vuelve al juego y pulsa **Reintentar**.

La compilación usa rutas relativas, por lo que también funciona cuando se publica dentro de una subcarpeta. Chrome para Android, Samsung Internet y Safari para iOS requieren que el sitio publicado tenga un certificado HTTPS válido.

## Rendimiento móvil

El juego detecta automáticamente dispositivos táctiles para reducir la resolución interna del Canvas y ajustar la cámara a 30 FPS. El detector procesa fotogramas nuevos de video, no repite inferencias sobre el mismo fotograma, y cambia a CPU si el delegado gráfico falla.

## Assets de sonido

Coloca estos archivos en `src/assets/sounds/` para activar audio real:

- `slice.mp3`
- `explosion.mp3`
- `gameover.mp3`
