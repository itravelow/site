"""Convierte el material real de Andrés en los archivos de los teléfonos del hero.

Uso:
  python assets-src/make_media.py                 # procesa todo lo que haya en media/raw/
  python assets-src/make_media.py --no-upscale    # fotos: sin escalado en kie.ai
  python assets-src/make_media.py --only buggy    # solo una pantalla

Entrada: assets-src/media/raw/<pantalla>.<ext>  (pantalla = avion | buggy | cocobongo | ...)
Cortes:  assets-src/media/raw/cuts.json  {"avion": {"start": 0, "duration": 16}, ...}
         (sin entrada: empieza en 0 y dura 12 s)
Salida:  public/media/phone-<pantalla>.webp  y, si hay video, .mp4 (540x960, 24 fps, <= ~1.5 MB)
Requiere ffmpeg en el PATH (aplica solo la rotación del iPhone). El escalado de fotos usa
recraft/crisp-upscale en kie.ai (KIE_API_KEY); kie.ai necesita una URL pública para la
imagen, así que se sube primero a su API de archivos. Los videos no se tocan con IA.
"""
import os, sys, json, time, io, base64, subprocess, urllib.request
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(ROOT)
RAW = os.path.join(ROOT, "media", "raw")
OUT = os.path.join(SITE, "public", "media")
IMG = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
VID = {".mp4", ".mov", ".m4v", ".webm"}
args = sys.argv[1:]
only = args[args.index("--only") + 1] if "--only" in args else None
upscale = "--no-upscale" not in args and bool(os.environ.get("KIE_API_KEY"))
cuts = {}
if os.path.exists(os.path.join(RAW, "cuts.json")):
    with open(os.path.join(RAW, "cuts.json"), encoding="utf-8") as fh:
        cuts = json.load(fh)


def kie(method, path, body=None, raw=None, ctype="application/json"):
    h = {"Authorization": "Bearer " + os.environ["KIE_API_KEY"], "Content-Type": ctype}
    data = raw if raw is not None else (json.dumps(body).encode() if body else None)
    r = urllib.request.Request("https://api.kie.ai" + path, data=data, headers=h, method=method)
    return json.load(urllib.request.urlopen(r))


def upscale_png(png_bytes):
    """Sube la imagen a kie.ai (base64) y la escala con recraft/crisp-upscale."""
    up = kie("POST", "/api/file-base64-upload", {"base64Data": "data:image/png;base64," + base64.b64encode(png_bytes).decode(), "uploadPath": "itravelow", "fileName": "src.png"})
    url = (up.get("data") or {}).get("downloadUrl") or (up.get("data") or {}).get("fileUrl")
    if not url:
        print("  sin URL de subida, se omite el escalado:", up.get("msg"))
        return png_bytes
    t = kie("POST", "/api/v1/jobs/createTask", {"model": "recraft/crisp-upscale", "input": {"image": url}})
    tid = t["data"]["taskId"]
    for _ in range(60):
        d = kie("GET", "/api/v1/jobs/recordInfo?taskId=" + tid)["data"]
        if d.get("state") == "success":
            return urllib.request.urlopen(json.loads(d["resultJson"])["resultUrls"][0]).read()
        if d.get("state") in ("fail", "failed"):
            print("  escalado falló, se usa la original"); return png_bytes
        time.sleep(5)
    return png_bytes


def to_9x16(im, w=540, h=960):
    im = ImageOps.exif_transpose(im).convert("RGB")
    return ImageOps.fit(im, (w, h), Image.LANCZOS, centering=(0.5, 0.5))


os.makedirs(OUT, exist_ok=True)
for f in sorted(os.listdir(RAW)) if os.path.isdir(RAW) else []:
    name, ext = os.path.splitext(f.lower())
    if only and name != only:
        continue
    src = os.path.join(RAW, f)
    if ext in IMG:
        im = Image.open(src)
        if upscale:
            buf = io.BytesIO(); ImageOps.exif_transpose(im).convert("RGB").save(buf, "PNG")
            im = Image.open(io.BytesIO(upscale_png(buf.getvalue())))
        to_9x16(im).save(os.path.join(OUT, f"phone-{name}.webp"), "WEBP", quality=80, method=6)
        print("imagen ok", name)
    elif ext in VID:
        c = cuts.get(name, {})
        start, dur = str(c.get("start", 0)), str(c.get("duration", 12))
        vf = "scale=540:960:force_original_aspect_ratio=increase,crop=540:960,fps=24"
        base = ["ffmpeg", "-v", "error", "-y", "-ss", start, "-t", dur, "-i", src, "-an", "-vf", vf]
        subprocess.run(base + ["-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p", "-crf", "30", "-maxrate", "750k", "-bufsize", "1500k", "-preset", "slow", "-movflags", "+faststart", os.path.join(OUT, f"phone-{name}.mp4")], check=True)
        # cartel (poster) desde el primer fotograma del corte
        poster = os.path.join(ROOT, "media", f"{name}-poster.png")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", start, "-i", src, "-frames:v", "1", "-vf", vf, poster], check=True)
        to_9x16(Image.open(poster)).save(os.path.join(OUT, f"phone-{name}.webp"), "WEBP", quality=80, method=6)
        for e in ("mp4", "webp"):
            p = os.path.join(OUT, f"phone-{name}.{e}"); print(f"video ok {name}.{e} {os.path.getsize(p) // 1024} KB")
print("listo. Si agregaste una pantalla nueva, ponla en la lista `phones` de src/components/Landing.astro.")
