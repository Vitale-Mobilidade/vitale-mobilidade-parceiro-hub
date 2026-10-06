update public.youtube_editorial_sources s set state='rewrite_pending'
from public.editorial_articles a, public.youtube_editorial_inventory i
where a.id=s.article_id and i.video_id=s.video_id and not i.historical
  and s.state='needs_review' and a.status='draft' and a.published_at is null
  and (select r.status='failed' and r.error_code='article_editorial_voice_failed'
    from public.editorial_compiler_runs r where r.article_id=a.id order by r.started_at desc limit 1);

update public.youtube_editorial_sources s set state='rewrite_pending'
from public.editorial_articles a, public.youtube_editorial_inventory i
where a.id=s.article_id and i.video_id=s.video_id and not i.historical
  and s.state='done' and a.status='draft' and a.published_at is null
  and (exists(select 1 from jsonb_array_elements(a.blocks) b where b->>'type'='text' and
    concat_ws(' ',b->>'heading',b->>'text') ~* '(preço citado|foi citad[oa]|são classificados|segundo o cadastro|a fonte sustenta|foi avaliad[oa]|foram considerad[oa]s|é apresentada como)')
    or exists(select 1 from jsonb_array_elements(a.faq) f where f->>'answer' ~* '(foi citad[oa]|foi avaliad[oa]|foram considerad[oa]s|a fonte sustenta)'));