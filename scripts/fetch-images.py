"""Fetch public product images from known Flybubble product links; no database access."""
import concurrent.futures, json, urllib.request, urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'data/catalogue-rows.json').read_text(encoding='utf-8'))
images=json.loads((ROOT/'data/images.json').read_text())
urls={}
for r in data['DSGeneric']:
    urls[(r['Brand']+':'+r['Model']).lower()]=r.get('shopurl')
for r in data['WingsData']:
    if r.get('ShopURL'): urls[(r['Make']+':'+r['Model']).lower()]=r['ShopURL']
dest=ROOT/'public/products'
dest.mkdir(parents=True,exist_ok=True)
def fetch(pair):
    key,url=pair
    if key in images: return key,images[key]
    if not url: return None
    p=urllib.parse.urlparse(url)
    if p.hostname not in ['flybubble.com','www.flybubble.com'] or '/products/' not in p.path: return None
    try:
        req=urllib.request.Request('https://flybubble.com'+p.path.rstrip('/')+'.js',headers={'User-Agent':'Flybubble-Gear-Comparison/1.0'})
        product=json.load(urllib.request.urlopen(req,timeout=15))
        src=product.get('featured_image')
        if not src: return None
        src='https:'+src if src.startswith('//') else src
        if urllib.parse.urlparse(src).hostname != 'cdn.shopify.com': return None
        src+=('&' if '?' in src else '?')+'width=700'
        request=urllib.request.urlopen(src,timeout=15)
        if not request.headers.get('Content-Type','').startswith('image/'): return None
        payload=request.read(5_000_001)
        if len(payload)>5_000_000: return None
        import hashlib
        extension='.png' if 'png' in request.headers['Content-Type'] else '.webp' if 'webp' in request.headers['Content-Type'] else '.jpg'
        name=hashlib.sha256(key.encode()).hexdigest()[:16]+extension
        (dest/name).write_bytes(payload)
        return key,'/products/'+name
    except Exception: return None
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    for result in pool.map(fetch,urls.items()):
        if result: images[result[0]]=result[1]
(ROOT/'data/images.json').write_text(json.dumps(images,indent=2),encoding='utf-8')
print(f'{len(images)} product photos available')
