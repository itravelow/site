# Material audiovisual del sitio

## Qué va en los teléfonos del hero

Tres pantallas verticales (9:16). Hoy tienen **relleno temporal generado en kie.ai**
(`media/phone-*.png`, tareas en `kie_tasks_v3.json`; video del avión hecho con Kling a partir
de la imagen). Se reemplazan con el material real de Andrés en cuanto llegue.

| Pantalla | Archivo final | Hoy | Debe ser |
|---|---|---|---|
| Centro | `public/media/phone-avion.{webp,mp4,webm}` | generado | video real del avión aterrizando en Punta Cana |
| Izquierda | `public/media/phone-saona.webp` (+ video opcional) | generado | foto o video real de Isla Saona |
| Derecha | `public/media/phone-buggy.webp` (+ video opcional) | generado | foto o video real de buggies o playa |

Regla: material propio o con permiso escrito. Nada tomado de otros sitios ni con marcas de
agua quitadas (es material con derechos y, además, se nota). Si falta algo, Pexels o Unsplash
con licencia libre.

## Cómo meter tu material (Andrés)

1. Copia las fotos (JPG/PNG/HEIC convertido) y los videos (MP4/MOV) a `assets-src/media/raw/`.
   Nombra cada archivo con la pantalla destino: `avion.mp4`, `saona.jpg`, `buggy.mov`.
2. Pide a Claude Code que corra `python assets-src/make_media.py` (necesita `KIE_API_KEY` en
   el entorno y ffmpeg instalado). El script:
   - fotos: recorta a 9:16 centrado, escala con `recraft/crisp-upscale` (0,0025 USD por
     imagen) y guarda WebP de 720×1280 en `public/media/`;
   - videos: toma los primeros 6 segundos (o el tramo que indiques con `--start`), quita el
     audio, recorta a 9:16 a 720×1280, 24 fps, y guarda `.mp4` (H.264, ~400 KB) y `.webm`
     (VP9), listos para autoplay en silencio.
3. Mira la página en local (`npm run dev`) y, si está bien, `npm run deploy`.

## Cuándo se ve video y cuándo imagen

El navegador decide: con wifi o cable se carga el video; con datos móviles, con "ahorro de
datos" activado o con "reducir movimiento" se queda la imagen. Sin información de conexión
(iPhone), escritorio recibe video y móvil imagen. Lógica en `src/pages/index.astro`, bloque 1
del script.

## Otros archivos

- `*.png` en esta carpeta: ilustraciones de la v2 (tarifario) y el OG, generadas en kie.ai.
- `fetch_kie.py` / `fetch_v3.py`: descargas desde kie.ai por id de tarea (los resultados
  caducan a los 14 días).
- `index-v2.astro.bak`: portada anterior, por si hay que recuperar algo.
