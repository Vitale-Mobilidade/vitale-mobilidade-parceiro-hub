-- One scoped algorithm-change recovery: legacy fixed-title corrections were already exhausted.
-- Normal automatic cap stays at two; this known third attempt cannot be replayed by the scheduler or migration.
update youtube_editorial_sources s set state='rewrite_pending',
 capture=s.capture||jsonb_build_object('publicationRepairCount',3,'publicationTitleRecovery',true)
from editorial_articles a, youtube_editorial_inventory i
where a.id=s.article_id and i.video_id=s.video_id and not i.historical
and s.video_id='QE9l0QuS1h8' and s.state='needs_review' and a.status='draft' and a.published_at is null
and s.capture->>'publicationRepairCount'='2' and not (s.capture ? 'publicationTitleRecovery')
and s.capture->'publicationQa'->>'version'='automatic-publication-v5'
and s.capture->'publicationQa'->>'pass'='false'
and s.capture->'publicationQa'->'articleRevision'=to_jsonb(a.revision)
and s.capture->>'channelId'='UC9LuObKw8ZLoQBk6qHydEeg';
