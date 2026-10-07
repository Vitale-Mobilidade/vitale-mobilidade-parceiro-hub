-- Safe retry of deterministic pre-QA failures only. No text/image generation is replayed.
update youtube_editorial_sources s set state='publish_pending'
from editorial_articles a, youtube_editorial_inventory i
where a.id=s.article_id and i.video_id=s.video_id and not i.historical
and s.state='needs_review' and a.status='draft' and a.published_at is null
and exists(select 1 from editorial_audit_logs l where l.entity_id=a.id::text
 and l.action='automatic_publication_failed'
 and l.detail->>'version'='automatic-publication-v1'
 and l.detail->>'code'='automatic_publication_validation_failed'
 and l.detail->'issues'='["Seção ou FAQ sem evidência literal."]'::jsonb);

-- Completed, known QA rejection: one bounded correction by the same writer, no manual prose edits.
update youtube_editorial_sources s set state='rewrite_pending', capture=s.capture||jsonb_build_object('publicationRepairAttempted',true)
from editorial_articles a, youtube_editorial_inventory i
where a.id=s.article_id and i.video_id=s.video_id and not i.historical
and s.state='needs_review' and a.status='draft' and a.published_at is null
and s.video_id='cf-AF7LgqpY' and s.capture->'publicationQa'->>'version'='automatic-publication-v1'
and s.capture->'publicationQa'->>'pass'='false' and not (s.capture ? 'publicationRepairAttempted');
