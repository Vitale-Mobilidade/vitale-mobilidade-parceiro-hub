-- Known completed voice rejection; respect the two-correction cap and keep all reader prose unchanged here.
update youtube_editorial_sources s set state='rewrite_pending',
 capture=jsonb_set(s.capture,'{publicationQa,issues}',coalesce(s.capture->'publicationQa'->'issues','[]'::jsonb)||
 (select jsonb_agg('Reescrever com voz direta, sem relato: '||fragment) from jsonb_array_elements_text(v.detail->'fragments') fragment),true)
 ||jsonb_build_object('publicationRepairAttempted',true,'publicationRepairCount',2)
from editorial_articles a, youtube_editorial_inventory i, lateral (
 select detail from editorial_audit_logs where action='voice_validation_failed'
 and entity_id='53d6210a-5152-4fe4-b129-5f3eb61be995' order by created_at desc limit 1
) v
where a.id=s.article_id and i.video_id=s.video_id and not i.historical
and s.video_id='cf-AF7LgqpY' and s.state='needs_review' and a.status='draft' and a.published_at is null
and s.capture->'publicationQa'->>'pass'='false' and not (s.capture ? 'publicationRepairCount')
and jsonb_array_length(v.detail->'fragments')>0
and exists(select 1 from editorial_compiler_runs r where r.article_id=a.id and r.status='failed' and r.error_code='article_editorial_voice_failed');

-- Known completed V9 QA with the legacy boolean counter: one remaining correction, now with a distinct grounded title and free cover recomposition.
update youtube_editorial_sources s set state='rewrite_pending', capture=s.capture||jsonb_build_object('publicationRepairAttempted',true,'publicationRepairCount',2)
from editorial_articles a, youtube_editorial_inventory i
where a.id=s.article_id and i.video_id=s.video_id and not i.historical
and s.video_id='QE9l0QuS1h8' and s.state='needs_review' and a.status='draft' and a.published_at is null
and s.capture->'publicationQa'->>'pass'='false' and not (s.capture ? 'publicationRepairCount')
and exists(select 1 from editorial_audit_logs l where l.entity_id=a.id::text and l.action='automatic_publication_failed'
and l.detail->>'code'='automatic_publication_qa_failed' and l.detail->>'version'='automatic-publication-v5');
