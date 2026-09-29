"""Prepare guarded SQL and rollback locally; this script never connects to a database."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/seo-final-2026-09-29'
inventory = {a['slug']: a for a in json.loads((OUT/'article-inventory-current.json').read_text())}
patch = {}
def row(slug):
    a = inventory[slug]
    return patch.setdefault(slug, dict(slug=slug, expected_revision=a['revision'], old_type=a['content_type'], new_type=a['content_type'], old_title=a['title'], new_title=a['title'], blocks={}, faq={}))
for change in json.loads((OUT/'taxonomy-changes.json').read_text()):
    p = row(change['slug'])
    assert p['old_type'] == change['before']
    p['new_type'] = change['after']
for change in json.loads((OUT/'editorial-title-changes.json').read_text()):
    p = row(change['slug'])
    assert p['expected_revision'] == change['revision'] and p['old_title'] == change['before']
    p['new_title'] = change['after']
for change in json.loads((OUT/'editorial-copy-changes.json').read_text()):
    p = row(change['slug'])
    assert p['expected_revision'] == change['revision']
    field = 'blocks' if change['kind'] == 'block' else 'faq'
    key = str(change['index'])
    assert key not in p[field]
    p[field][key] = {k: change[k] for k in ('before', 'after')}
rows = sorted(patch.values(), key=lambda p: p['slug'])

def sql(rows):
    payload = json.dumps(rows, ensure_ascii=False)
    assert '$vitale_patch$' not in payload
    return f"""-- Prepared only. Apply after authorization and backup. One update per article.
-- Do not combine this with taxonomy-data-proposal.sql; these are alternative plans.
-- Slugs, publication dates, relations, offers and source excerpts are preserved.
BEGIN;
CREATE TEMP TABLE vitale_release_patch AS
SELECT * FROM jsonb_to_recordset($vitale_patch${payload}$vitale_patch$)
AS p(slug text, expected_revision integer, old_type text, new_type text, old_title text, new_title text, blocks jsonb, faq jsonb);
-- Lock target rows before checking revisions, closing the concurrent-edit window.
SELECT a.id FROM public.editorial_articles a JOIN vitale_release_patch p USING (slug) FOR UPDATE OF a;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.editorial_articles a JOIN vitale_release_patch p USING (slug)
 WHERE a.status='published' AND a.foundation_required IS FALSE AND a.revision=p.expected_revision AND a.content_type=p.old_type AND a.title=p.old_title
 AND NOT EXISTS (SELECT 1 FROM jsonb_each(p.blocks) b WHERE a.blocks->(b.key::integer)->>'text' IS DISTINCT FROM b.value->>'before')
 AND NOT EXISTS (SELECT 1 FROM jsonb_each(p.faq) f WHERE a.faq->(f.key::integer)->>'answer' IS DISTINCT FROM f.value->>'before')) <> {len(rows)}
 THEN RAISE EXCEPTION 'Editorial data changed; abort and reconcile before release'; END IF;
END $$;
UPDATE public.editorial_articles a
SET content_type=p.new_type, title=p.new_title,
 blocks=CASE WHEN p.blocks='{{}}'::jsonb THEN a.blocks ELSE (
  SELECT jsonb_agg(CASE WHEN p.blocks ? ((b.n-1)::text) THEN jsonb_set(b.value, '{{text}}', p.blocks->((b.n-1)::text)->'after') ELSE b.value END ORDER BY b.n)
  FROM jsonb_array_elements(a.blocks) WITH ORDINALITY b(value,n)) END,
 faq=CASE WHEN p.faq='{{}}'::jsonb THEN a.faq ELSE (
  SELECT jsonb_agg(CASE WHEN p.faq ? ((f.n-1)::text) THEN jsonb_set(f.value, '{{answer}}', p.faq->((f.n-1)::text)->'after') ELSE f.value END ORDER BY f.n)
  FROM jsonb_array_elements(a.faq) WITH ORDINALITY f(value,n)) END
FROM vitale_release_patch p
WHERE a.slug=p.slug AND a.status='published' AND a.foundation_required IS FALSE AND a.revision=p.expected_revision AND a.content_type=p.old_type AND a.title=p.old_title;
DROP TABLE vitale_release_patch;
COMMIT;
"""
(OUT/'release-data-patch.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2)+'\n')
(OUT/'release-data-proposal.sql').write_text(sql(rows))
rollback = json.loads(json.dumps(rows))
for p in rollback:
    p['expected_revision'] += 1
    p['old_type'], p['new_type'] = p['new_type'], p['old_type']
    p['old_title'], p['new_title'] = p['new_title'], p['old_title']
    for field in ('blocks', 'faq'):
        for edit in p[field].values():
            edit['before'], edit['after'] = edit['after'], edit['before']
(OUT/'release-data-rollback.sql').write_text(sql(rollback))
print(json.dumps({'articles': len(rows), 'classifications': sum(p['old_type']!=p['new_type'] for p in rows), 'blocks': sum(len(p['blocks']) for p in rows), 'faq': sum(len(p['faq']) for p in rows)}))
