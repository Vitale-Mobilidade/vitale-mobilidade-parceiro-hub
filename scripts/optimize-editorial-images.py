"""Generate local WebP variants from a published article inventory (Python + Pillow).

No uploads or production writes. Originals and OG URLs are preserved. Run again
when new published images are added; immutable source URLs select distinct files.
"""
import concurrent.futures
import hashlib
import io
import json
import sys
import urllib.request
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public/editorial'
OUTPUT.mkdir(parents=True, exist_ok=True)
inventory = json.loads(Path(sys.argv[1]).read_text())
report_path = ROOT / 'artifacts/seo-final-2026-09-29/image-optimization.json'
existing_records = json.loads(report_path.read_text()) if report_path.exists() else {}
urls = sorted({a.get('og_image_url', a.get('ogImageUrl')) for a in inventory if a.get('status', 'published') == 'published' and a.get('og_image_url', a.get('ogImageUrl'))})


def convert(url):
    # Only public editorial image origins; no arbitrary network target or local path.
    if not url.startswith(('https://i.ytimg.com/vi/', 'https://ipectfejftfcikvozoyu.supabase.co/functions/v1/bike-image?type=editorial-cover&')):
        raise ValueError('Unapproved image origin: '+url)
    key = hashlib.sha256(url.encode()).hexdigest()[:20]
    paths = [OUTPUT / f'{key}-{width}.webp' for width in (480, 768, 1280)]
    cached = existing_records.get(url)
    if cached and cached.get('key') == key and all(path.exists() for path in paths):
        return url, cached
    req = urllib.request.Request(url, headers={'User-Agent': 'Vitale-image-audit/1.0'})
    with urllib.request.urlopen(req, timeout=30) as response:
        raw = response.read(8*1024*1024+1)
    if len(raw) > 8*1024*1024: raise ValueError('Image exceeds size limit')
    image = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert('RGB')
    if image.width < 480: raise ValueError('Source image too small: '+url)
    for width, path in zip((480, 768, 1280), paths):
        resized = image.copy()
        resized.thumbnail((width, round(width * image.height / image.width)), Image.Resampling.LANCZOS)
        resized.save(path, 'WEBP', quality=78, method=6)
    return url, {'key':key,'width':image.width,'height':image.height,'sourceBytes':len(raw),'variantBytes':{str(width):p.stat().st_size for width,p in zip((480,768,1280),paths)}}


records = {}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for i, (url, record) in enumerate(pool.map(convert, urls)):
        records[url] = record
        if (i+1)%20 == 0: print(f'{i+1}/{len(urls)} images optimized',flush=True)
(ROOT / 'src/lib/editorial-images-manifest.json').write_text(json.dumps({url:{'key':r['key'],'width':r['width'],'height':r['height']} for url,r in records.items()},indent=2)+'\n')
(ROOT / 'artifacts/seo-final-2026-09-29/image-optimization.json').write_text(json.dumps(records,indent=2))
print(f'{len(records)} public images, three WebP sizes each; original URLs preserved')
