"""Descarga los resultados de kie.ai (tareas en kie_tasks.json) y genera los WebP del sitio."""
import json, urllib.request, time, io, os, sys
from PIL import Image, ImageOps
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env=dict(l.strip().split('=',1) for l in open(os.path.join(os.path.dirname(ROOT),'.env'),encoding='utf-8') if '=' in l and not l.startswith('#'))
H={'Authorization':f"Bearer {env['KIE_API_KEY']}"}
SRC=os.path.join(ROOT,'assets-src'); OUT=os.path.join(ROOT,'public','img'); os.makedirs(OUT,exist_ok=True)
ids=json.load(open(os.path.join(SRC,'kie_tasks.json')))
def get(u): return json.load(urllib.request.urlopen(urllib.request.Request(u,headers=H)))
pending=dict(ids); deadline=time.time()+420; done={}
while pending and time.time()<deadline:
    for k,t in list(pending.items()):
        r=get(f'https://api.kie.ai/api/v1/jobs/recordInfo?taskId={t}')
        if r.get('code')!=200: print(k,'error',r.get('msg')); pending.pop(k); continue
        st=r['data']['state']
        if st=='success':
            url=r['data']['response']['resultUrls'][0]; done[k]=url; pending.pop(k); print(k,'ok',r['data'].get('creditsConsumed'))
        elif st=='fail':
            print(k,'FAIL',r['data'].get('failMsg')); pending.pop(k)
    if pending: time.sleep(4)
print('pendientes sin terminar:', list(pending))
def save(img, name, w, q=82):
    im=img.copy(); im.thumbnail((w, 100000), Image.LANCZOS)
    p=os.path.join(OUT,name); im.save(p,'WEBP',quality=q,method=6); print(name, im.size, os.path.getsize(p)//1024,'KB')
for k,url in done.items():
    raw=urllib.request.urlopen(url).read(); open(os.path.join(SRC,f'{k}.png'),'wb').write(raw)
    img=Image.open(io.BytesIO(raw)).convert('RGB'); print(k,'origen',img.size)
    if k=='hero': save(img,'hero-1200.webp',1200); save(img,'hero-800.webp',800)
    elif k=='og':
        im=ImageOps.fit(img,(1200,630),Image.LANCZOS)
        logo=Image.open(os.path.join(ROOT,'public','logo.png')).convert('RGBA'); logo.thumbnail((300,90))
        pad=Image.new('RGBA',(logo.width+40,logo.height+28),(255,255,255,235)); pad.alpha_composite(logo,(20,14))
        im=im.convert('RGBA'); im.alpha_composite(pad,(44,44)); im.convert('RGB').save(os.path.join(ROOT,'public','og.jpg'),'JPEG',quality=85,optimize=True)
        print('og.jpg', os.path.getsize(os.path.join(ROOT,'public','og.jpg'))//1024,'KB')
    else: save(img,f'{k}-480.webp',480)
