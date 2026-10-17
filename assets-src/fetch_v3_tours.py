"""Fotos realistas temporales de los 4 productos (4:3) para el tarifario. Crea y descarga."""
import os, json, time, urllib.request, io
from PIL import Image, ImageOps
ROOT=os.path.dirname(os.path.abspath(__file__)); SITE=os.path.dirname(ROOT)
K=os.environ["KIE_API_KEY"]; H={"Authorization":"Bearer "+K,"Content-Type":"application/json"}
def get(u): return json.load(urllib.request.urlopen(urllib.request.Request(u,headers=H)))
def post(u,b): return json.load(urllib.request.urlopen(urllib.request.Request(u,data=json.dumps(b).encode(),headers=H,method="POST")))
style=" Editorial travel photography, full-frame camera, natural light, true-to-life colors, no text, no logos, no watermarks, no recognizable faces."
prompts={
 "traslado":"A clean white private minivan with tinted windows parked at the curb of Punta Cana airport arrivals, palm trees and bright tropical sky, a driver in a white shirt seen from behind holding a blank white sign."+style,
 "buggies":"Two off-road buggies covered in red mud on a dirt trail near Macao beach, Dominican Republic, palm trees, late afternoon light, dust in the air."+style,
 "saona":"A white catamaran with sails near the white sand beach of Isla Saona, turquoise shallow water, palm trees, blue sky with small clouds."+style,
 "cocobongo":"Interior of a large nightclub show with pink and turquoise stage lights, confetti in the air, acrobats silhouetted above the crowd, dramatic haze."+style,
}
tasks={}
for n,p in prompts.items():
    r=post("https://api.kie.ai/api/v1/jobs/createTask",{"model":"gpt-image-2-text-to-image","input":{"prompt":p,"aspect_ratio":"4:3","resolution":"2K"}})
    tasks[n]=r["data"]["taskId"]; print("task",n,r["code"],flush=True); time.sleep(1.1)
json.dump(tasks,open(os.path.join(ROOT,"kie_tasks_v3_tours.json"),"w"),indent=1)
for n,t in tasks.items():
    while True:
        d=get("https://api.kie.ai/api/v1/jobs/recordInfo?taskId="+t)["data"]
        if d.get("state")=="success": url=json.loads(d["resultJson"])["resultUrls"][0]; break
        if d.get("state") in ("fail","failed"): raise SystemExit("fail "+n)
        time.sleep(8)
    raw=urllib.request.urlopen(url).read(); open(os.path.join(ROOT,"media",n+"-real.png"),"wb").write(raw)
    im=ImageOps.fit(Image.open(io.BytesIO(raw)).convert("RGB"),(960,720),Image.LANCZOS)
    im.save(os.path.join(SITE,"public","img",n+"-960.webp"),"WEBP",quality=80,method=6)
    im.resize((480,360),Image.LANCZOS).save(os.path.join(SITE,"public","img",n+"-480.webp"),"WEBP",quality=80,method=6)
    print("ok",n,flush=True)
print("done")
