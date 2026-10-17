"""Convierte el material real de Andrés en los archivos de los teléfonos del hero.

Uso:
  python assets-src/make_media.py                 # procesa todo lo que haya en media/raw/
  python assets-src/make_media.py --start 4       # videos: empezar en el segundo 4
  python assets-src/make_media.py --no-upscale    # fotos: sin escalado en kie.ai

Entrada: assets-src/media/raw/<pantalla>.<ext>  (pantalla = avion | saona | buggy)
Salida:  public/media/phone-<pantalla>.webp  y, si hay video, .mp4 + .webm
Requiere ffmpeg en el PATH. El escalado usa recraft/crisp-upscale en kie.ai (KIE_API_KEY);
kie.ai necesita una URL pública para la imagen, así que se sube primero a su API de archivos.
"""
import os, sys, json, time, io, base64, subprocess, urllib.request
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(ROOT)
RAW = os.path.join(ROOT, "media", "raw")
OUT = os.path.join(SITE, "public", "media")
IMG = {".jpg", ".jpeg", ".png", ".webp"}
VID = {".mp4", ".mov", ".m4v", ".webm"}
args = sys.argv[1:]
start = "0"
if "--start" in args:
    start = args[args.index("--start") + 1]
upscale = "--no-upscale" not in args and bool(os.environ.get("KIE_API_KEY"))


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


def to_9x16(im, w=720, h=1280):
    im = ImageOps.exif_transpose(im).convert("RGB")
    return ImageOps.fit(im, (w, h), Image.LANCZOS, centering=(0.5, 0.5))


os.makedirs(OUT, exist_ok=True)
for f in sorted(os.listdir(RAW)) if os.path.isdir(RAW) else []:
    name, ext = os.path.splitext(f.lower())
    src = os.path.join(RAW, f)
    if ext in IMG:
        im = Image.open(src)
        if upscale:
            buf = io.BytesIO(); ImageOps.exif_transpose(im).convert("RGB").save(buf, "PNG")
            im = Image.open(io.BytesIO(upscale_png(buf.getvalue())))
        to_9x16(im).save(os.path.join(OUT, f"phone-{name}.webp"), "WEBP", quality=80, method=6)
        print("imagen ok", name)
    elif ext in VID:
        vf = "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=24"
        base = ["ffmpeg", "-y", "-ss", start, "-t", "6", "-i", src, "-an", "-vf", vf]
        subprocess.run(base + ["-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p", "-crf", "30", "-preset", "slow", "-movflags", "+faststart", os.path.join(OUT, f"phone-{name}.mp4")], check=True)
        subprocess.run(base + ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38", "-row-mt", "1", os.path.join(OUT, f"phone-{name}.webm")], check=True)
        # cartel (poster) desde el primer fotograma
        subprocess.run(["ffmpeg", "-y", "-ss", start, "-i", src, "-frames:v", "1", "-vf", vf, os.path.join(ROOT, "media", f"{name}-poster.png")], check=True)
        to_9x16(Image.open(os.path.join(ROOT, "media", f"{name}-poster.png"))).save(os.path.join(OUT, f"phone-{name}.webp"), "WEBP", quality=80, method=6)
        print("video ok", name)
print("listo. Si agregaste video a una pantalla sin video, pon data-video en src/pages/index.astro (lista `phones`).")
