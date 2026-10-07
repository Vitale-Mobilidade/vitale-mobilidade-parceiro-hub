-- Known completed extraction rejected by exact-text validation; never resume uncertain timeouts.
update youtube_editorial_sources s set state='publish_pending'
from editorial_articles a, youtube_editorial_inventory i
where a.id=s.article_id and i.video_id=s.video_id and not i.historical
and s.state='needs_review' and a.status='draft' and a.published_at is null
and exists(select 1 from editorial_audit_logs l where l.entity_id=a.id::text
and l.action='automatic_publication_failed' and l.detail->>'version' in ('automatic-publication-v3','automatic-publication-v4')
and l.detail->>'code'='publication_evidence_invalid');
