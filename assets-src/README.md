# Material audiovisual del sitio

## Qué va en los teléfonos del hero

Tres pantallas verticales con **video real de Andrés** (desde el 17 oct 2026), sin retoque
por IA. Al tocar un teléfono lateral pasa al frente y el del frente ocupa su lugar.

| Pantalla inicial | Archivo final | Contenido |
|---|---|---|
| Centro | `public/media/phone-avion.{webp,mp4}` | ventana del avión al descender sobre Punta Cana (IMG_3015, 0 a 16 s) |
| Izquierda | `public/media/phone-buggy.{webp,mp4}` | buggy por el camino de tierra en Macao (IMG_2878, 0,5 a 15,5 s) |
| Derecha | `public/media/phone-cocobongo.{webp,mp4}` | show de láser en Coco Bongo (IMG_2970, 25 a 41 s) |

Los originales (4K, 50 a 190 MB) están en `assets-src/media/raw/` (ignorado por git) y en
`iTravelow/media/`. Regla: material propio o con permiso escrito. Nada tomado de otros sitios
ni con marcas de agua quitadas. Si falta algo, Pexels o Unsplash con licencia libre.

Las fotos de producto en `public/img/` siguen siendo relleno generado (temporal).

## Cómo cambiar o añadir material (Andrés)

1. Copia el archivo a `assets-src/media/raw/` con el nombre de la pantalla: `avion.mov`,
   `buggy.mov`, `cocobongo.mov` (o `.jpg` si es foto).
2. Si es video, indica el tramo en `assets-src/media/raw/cuts.json`:
   `{"avion": {"start": 0, "duration": 16}}` (sin entrada: desde 0, 12 s).
3. Pide a Claude Code que corra `python assets-src/make_media.py` (ffmpeg instalado). El script:
   - videos: aplica la rotación del iPhone, quita el audio, recorta a 9:16 a 540×960, 24 fps,
     H.264 con tope de 750 kbps (0,5 a 1,5 MB por clip) y guarda el cartel `.webp` del primer
     fotograma. No pasa por IA.
   - fotos: recorta a 9:16, escala con `recraft/crisp-upscale` en kie.ai (0,0025 USD; se
     omite con `--no-upscale`) y guarda WebP.
4. Si es una pantalla nueva, añádela a la lista `phones` en `src/components/Landing.astro`
   y su título en `hero.captions` de `src/i18n/es.ts` y `en.ts`.
5. Mira la página en local (`npm run dev`) y, si está bien, `npm run deploy`.

## Cuándo se ve video y cuándo imagen

El navegador decide: con wifi o cable se cargan los videos (primero el del frente, luego los
otros dos); con datos móviles, con "ahorro de datos" activado o con "reducir movimiento" se
queda la imagen. Sin información de conexión (iPhone), escritorio recibe video y móvil imagen.
Lógica en `src/components/Landing.astro`, bloque 1 del script.

## Otros archivos

- `*.png` en esta carpeta: ilustraciones de la v2 (tarifario) y el OG antiguo, generadas en kie.ai.
- `fetch_kie.py` / `fetch_v3*.py`: descargas desde kie.ai por id de tarea (caducan a los 14 días).
- `index-v2.astro.bak`, `index-v3-combos.astro.bak`: portadas anteriores (la v3 antes de
  separar idiomas), por si hay que recuperar algo.
