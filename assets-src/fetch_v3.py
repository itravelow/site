"""Descarga las imágenes verticales de kie.ai, genera un video corto (Kling) a partir de la
del avión y produce los archivos optimizados para los teléfonos del hero.
Uso: KIE_API_KEY en el entorno; python fetch_v3.py
Salida: public/media/phone-{avion,saona,buggy}.webp (720x1280) y phone-avion.{mp4,webm}."""
import os, json, time, urllib.request, subprocess, io, sys
from PIL import Image
ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(ROOT)
K = os.environ["KIE_API_KEY"]
H = {"Authorization": "Bearer " + K, "Content-Type": "application/json"}
def get(u):
    return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=H)))
def post(u, b):
    return json.load(urllib.request.urlopen(urllib.request.Request(u, data=json.dumps(b).encode(), headers=H, method="POST")))
def wait(task_id, every=8, limit=900):
    t0 = time.time()
    while time.time() - t0 < limit:
        d = get("https://api.kie.ai/api/v1/jobs/recordInfo?taskId=" + task_id)["data"]
        st = d.get("state")
        if st == "success":
            return json.loads(d["resultJson"])["resultUrls"]
        if st in ("fail", "failed"):
            raise SystemExit("task failed: " + json.dumps(d)[:300])
        time.sleep(every)
    raise SystemExit("timeout " + task_id)
tasks = json.load(open(os.path.join(ROOT, "kie_tasks_v3.json")))
urls = {}
for name, tid in tasks.items():
    urls[name] = wait(tid)[0]
    raw = urllib.request.urlopen(urls[name]).read()
    open(os.path.join(ROOT, "media", name + ".png"), "wb").write(raw)
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    # recorte 9:16 centrado y 720x1280
    w, h = im.size
    tw = int(h * 9 / 16)
    if w > tw:
        im = im.crop(((w - tw) // 2, 0, (w - tw) // 2 + tw, h))
    im = im.resize((720, 1280), Image.LANCZOS)
    im.save(os.path.join(SITE, "public", "media", name + ".webp"), "WEBP", quality=78, method=6)
    print("ok", name, flush=True)
# video: Kling 2.1 standard, 5 s, a partir de la imagen del avión (25 créditos)
r = post("https://api.kie.ai/api/v1/jobs/createTask", {"model": "kling/v2-1-standard", "input": {
    "prompt": "Slow, smooth aerial descent over the turquoise Caribbean coast seen from the airplane window; the wing stays steady, clouds drift gently, water sparkles. Realistic, no text.",
    "image_url": urls["phone-avion"], "duration": "5", "negative_prompt": "text, watermark, logo, distortion, people"}})
print("kling", r, flush=True)
vid = wait(r["data"]["taskId"], every=15, limit=1500)[0]
src = os.path.join(ROOT, "media", "phone-avion-kling.mp4")
open(src, "wb").write(urllib.request.urlopen(vid).read())
tasks["phone-avion-video"] = r["data"]["taskId"]
json.dump(tasks, open(os.path.join(ROOT, "kie_tasks_v3.json"), "w"), indent=1)
out = os.path.join(SITE, "public", "media")
vf = "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=24"
subprocess.run(["ffmpeg", "-y", "-i", src, "-an", "-vf", vf, "-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p", "-crf", "30", "-preset", "slow", "-movflags", "+faststart", os.path.join(out, "phone-avion.mp4")], check=True)
subprocess.run(["ffmpeg", "-y", "-i", src, "-an", "-vf", vf, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38", "-row-mt", "1", os.path.join(out, "phone-avion.webm")], check=True)
print("done", flush=True)
