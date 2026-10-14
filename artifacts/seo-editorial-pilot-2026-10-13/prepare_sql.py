"""Generate protected update/rollback scripts from the local reviewed payload."""
import json
from pathlib import Path

base = Path(__file__).parent
proposals = json.loads((base / "proposal.local").read_text())
sources = json.loads((base / "source-backup.local").read_text())["rows"]
columns = ["title", "summary", "summary_source_excerpt", "blocks", "seo_title", "meta_description", "og_title", "og_description"]

def emit(items, name, rollback=False):
    payload = json.dumps(items, ensure_ascii=False)
    if "$pilot_payload$" in payload:
        raise ValueError("Unexpected SQL dollar delimiter in payload")
    assignments = ",\n      ".join(
        f"{column} = p->'fields'->'{column}'" if column == "blocks" else f"{column} = p->'fields'->>'{column}'"
        for column in columns
    )
    source_guard = "" if rollback else """
    IF NOT EXISTS (SELECT 1 FROM public.editorial_videos v
      WHERE v.youtube_id = a.video_id AND md5(v.transcript) = p->>'sourceMd5') THEN
      RAISE EXCEPTION 'source changed: %', a.slug;
    END IF;
"""
    expected_guard = "" if not rollback else """
    IF NOT (to_jsonb(a) @> (p->'expectedFields')) THEN
      RAISE EXCEPTION 'article contents changed after release: %', a.slug;
    END IF;
"""
    sql = f"""-- {'Rollback' if rollback else 'Reviewed ten-article pilot'}. Execute only after explicit approval.
-- No migrations, trigger changes, status changes or revision resets.
BEGIN;
DO $pilot_body$
DECLARE p jsonb; a public.editorial_articles%ROWTYPE; updated_count integer := 0;
BEGIN
  FOR p IN SELECT value FROM jsonb_array_elements($pilot_payload${payload}$pilot_payload$::jsonb) ORDER BY value->>'id'
  LOOP
    SELECT * INTO a FROM public.editorial_articles WHERE id = (p->>'id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'article missing: %', p->>'id'; END IF;
    IF a.slug IS DISTINCT FROM p->>'slug' OR a.revision IS DISTINCT FROM (p->>'expectedRevision')::integer
       OR a.status <> 'published' OR NOT a.indexable OR a.foundation_required IS DISTINCT FROM false THEN
      RAISE EXCEPTION 'article precondition failed: %', p->>'slug';
    END IF;
{source_guard}{expected_guard}
    UPDATE public.editorial_articles SET
      {assignments}
      WHERE id = a.id;
    updated_count := updated_count + 1;
  END LOOP;
  IF updated_count <> 10 THEN RAISE EXCEPTION 'expected ten updates, found %', updated_count; END IF;
END
$pilot_body$;
COMMIT;
"""
    (base / name).write_text(sql)

forward = []
rollback = []
for p in proposals:
    old = next(r for r in sources if r["id"] == p["id"])
    merged = {**old, **p["fields"]}
    current_fields = {column: merged[column] for column in columns}
    forward.append({**p, "fields": current_fields})
    rollback.append({"id": p["id"], "slug": p["slug"], "expectedRevision": p["expectedRevision"] + 1,
        "fields": {column: old[column] for column in columns}, "expectedFields": current_fields})
emit(forward, "release-proposal.sql.local")
emit(rollback, "rollback.sql.local", rollback=True)
print("Prepared update and revision-protected rollback; not executed.")
