-- A second completed QA surfaced a new technical definition issue, not an uncertain AI request.
update youtube_editorial_sources s set state='rewrite_pending', capture=s.capture||jsonb_build_object('publicationRepairAttempted',true,'publicationRepairCount',2)
from editorial_articles a, youtube_editorial_inventory i
where a.id=s.article_id and i.video_id=s.video_id and not i.historical
and s.video_id='4jUW7M7Iz1s' and s.state='needs_review' and a.status='draft' and a.published_at is null
and s.capture->'publicationQa'->>'version'='automatic-publication-v4'
and s.capture->'publicationQa'->>'pass'='false'
and not (s.capture ? 'publicationRepairCount')
and exists(select 1 from editorial_audit_logs l where l.entity_id=a.id::text and l.action='automatic_publication_failed'
 and l.detail->>'version'='automatic-publication-v4' and l.detail->>'code'='automatic_publication_qa_failed');
