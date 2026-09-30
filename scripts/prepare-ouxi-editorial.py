"""Prepare guarded editorial correction and replacement covers; never writes to Supabase.

Run with the checkout's .env and Pillow installed. This script performs public read-only
RPC calls, then writes local review artifacts and JPG covers. Apply SQL only after review.
"""
import concurrent.futures
import io
import json
import os
from pathlib import Path
import re
import urllib.request

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts/ouxi-2026-09-30"
SNAPSHOT = ARTIFACTS / "inventory-snapshot.local.json"
COVERS = ROOT / "public/og/articles"
BIKES = {"gt2000", "v8_pro", "v8_pro_s"}
PUBLIC_KEYS = {"title": "title", "summary": "summary", "seoTitle": "seo_title", "metaDescription": "meta_description", "ogTitle": "og_title", "ogDescription": "og_description"}
FONT_DIR = Path("/System/Library/Fonts/Supplemental")


def env():
    for line in (ROOT / ".env").read_text().splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            os.environ[key] = value.strip('"')


def article(slug):
    req = urllib.request.Request(
        os.environ["SUPABASE_URL"] + "/rest/v1/rpc/get_published_editorial_article",
        data=json.dumps({"p_slug": slug}).encode(),
        headers={"apikey": os.environ["SUPABASE_PUBLISHABLE_KEY"], "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=15) as response:
        return json.load(response)


def corrected(value):
    return re.sub(r"WANSHIDA", "Ouxi", value, flags=re.IGNORECASE) if isinstance(value, str) else value


def wrap(draw, text, face, limit):
    lines, current = [], ""
    for word in text.split():
        candidate = f"{current} {word}".strip()
        if current and draw.textbbox((0, 0), candidate, font=face)[2] > limit:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def make_cover(row, title):
    with urllib.request.urlopen(row["ogImageUrl"], timeout=20) as response:
        image = Image.open(io.BytesIO(response.read())).convert("RGB")
    image = image.resize((1280, 720), Image.Resampling.LANCZOS)
    overlay = Image.new("RGBA", image.size)
    pixels = overlay.load()
    for y in range(300, 720):
        alpha = min(255, 110 + int((y - 300) * 2.6))
        for x in range(1280):
            pixels[x, y] = (0, 26, 20, alpha)
    canvas = Image.alpha_composite(image.convert("RGBA"), overlay)
    draw = ImageDraw.Draw(canvas)
    size = 58
    while size >= 39:
        face = ImageFont.truetype(str(FONT_DIR / "Arial Bold.ttf"), size)
        lines = wrap(draw, title, face, 1150)
        if len(lines) <= 4 and 720 - len(lines) * (size + 7) >= 394:
            break
        size -= 2
    y = 430
    for line in lines:
        draw.text((60, y), line, font=face, fill="white", stroke_width=1, stroke_fill="#00231b")
        y += size + 7
    destination = COVERS / f"{row['id']}.jpg"
    canvas.convert("RGB").save(destination, "JPEG", quality=87, optimize=True, progressive=True)
    return f"https://vitalemobilidade.com/og/articles/{row['id']}.jpg"


def sql_value(value):
    encoded = json.dumps(value, ensure_ascii=False)
    if "$v$" in encoded:
        raise ValueError("SQL delimiter collision")
    return "$v$" + encoded + "$v$::jsonb"


def literal(field, value):
    if value is None:
        return "NULL"
    encoded = sql_value(value)
    return encoded if field in ("blocks", "faq") else f"({encoded} #>> '{{}}')"


def render_sql(patch, reverse=False):
    rows = []
    for p in patch:
        before = p["after"] if reverse else p["before"]
        after = p["before"] if reverse else p["after"]
        revision = p["revision"] + (1 if reverse else 0)
        where = [f"id = '{p['id']}'::uuid", "status = 'published'", f"revision = {revision}"]
        sets = []
        for field in ("title", "summary", "seo_title", "meta_description", "og_title", "og_description", "og_image_url"):
            if before[field] == after[field]:
                continue
            where.append(f"{field} IS NOT DISTINCT FROM {literal(field, before[field])}")
            sets.append(f"{field} = {literal(field, after[field])}")
        for field, keys in (("blocks", ("heading", "text")), ("faq", ("question", "answer"))):
            if len(before[field]) != len(after[field]):
                raise ValueError(f"Array length changed in {p['slug']}")
            expr = field
            for index, (old_item, new_item) in enumerate(zip(before[field], after[field])):
                for key in keys:
                    if old_item.get(key) == new_item.get(key):
                        continue
                    path = f"'{{{index},{key}}}'"
                    where.append(f"{field} #> {path} IS NOT DISTINCT FROM {sql_value(old_item.get(key))}")
                    expr = f"jsonb_set({expr}, {path}, {sql_value(new_item.get(key))})"
            if expr != field:
                sets.append(f"{field} = {expr}")
        rows.append(f"DO $migration$ DECLARE changed integer; BEGIN\nUPDATE public.editorial_articles SET\n    {', '.join(sets)}\nWHERE {' AND '.join(where)};\nGET DIAGNOSTICS changed = ROW_COUNT;\nIF changed <> 1 THEN RAISE EXCEPTION 'Article changed: {p['slug']}'; END IF;\nEND $migration$;")
    label = "ROLLBACK" if reverse else "REVIEW ONLY. Deploy static covers first"
    return f"-- {label}. Back up affected records before applying.\nBEGIN;\n" + "\n".join(rows) + "\nCOMMIT;\n"


def main():
    env()
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    COVERS.mkdir(parents=True, exist_ok=True)
    snapshot = json.loads(SNAPSHOT.read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(lambda x: (x, article(x["slug"])), snapshot))
    patch = []
    for old, live in results:
        if not live or live.get("slug") != old["slug"]:
            continue  # Article removed or unavailable since the inventory snapshot.
        linked = old.get("primary_bike_id") in BIKES or bool(BIKES.intersection(old.get("related_bike_ids") or []))
        visible = {k: live.get(k) for k in PUBLIC_KEYS}
        blocks = live.get("blocks") or []
        faq = live.get("faq") or []
        text = json.dumps([visible, blocks, faq], ensure_ascii=False)
        mentions = bool(re.search("wanshida", text, re.IGNORECASE))
        if not (linked or mentions):
            continue
        if live.get("title") != old["title"]:
            raise RuntimeError(f"Target changed since snapshot: {old['slug']}")
        if not live.get("ogImageUrl"):
            raise RuntimeError(f"Missing cover: {old['slug']}")
        updated_fields = {column: corrected(live.get(key)) for key, column in PUBLIC_KEYS.items()}
        new_blocks = [{**block, **{key: corrected(block.get(key)) for key in ("heading", "text") if key in block}} for block in blocks]
        new_faq = [{**entry, **{key: corrected(entry.get(key)) for key in ("question", "answer") if key in entry}} for entry in faq]
        new_url = make_cover(live, updated_fields["title"])
        patch.append({
            "id": live["id"], "slug": live["slug"], "revision": old["revision"],
            "before": {**{column: live.get(key) for key, column in PUBLIC_KEYS.items()}, "blocks": blocks, "faq": faq, "og_image_url": live["ogImageUrl"]},
            "after": {**updated_fields, "blocks": new_blocks, "faq": new_faq, "og_image_url": new_url},
            "linked_bikes": [x for x in [old.get("primary_bike_id"), *(old.get("related_bike_ids") or [])] if x in BIKES],
        })
    (ARTIFACTS / "correction-proposal.json").write_text(json.dumps(patch, ensure_ascii=False, indent=2) + "\n")
    # The renderer validates every affected row; this script never applies SQL.
    (ARTIFACTS / "correction-proposal.sql").write_text(render_sql(patch))
    (ARTIFACTS / "correction-rollback.sql").write_text(render_sql(patch, reverse=True))
    print(json.dumps({"articles": len(patch), "with_text_changes": sum(p["before"]["title"] != p["after"]["title"] or p["before"]["blocks"] != p["after"]["blocks"] or p["before"]["faq"] != p["after"]["faq"] for p in patch), "covers": len(patch)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
