-- Private, additive scheduling only; no new state or client permission.
alter table public.youtube_editorial_sources
  add column caption_retry_at timestamptz,
  add column caption_retry_bike_ids text[];
create index youtube_caption_retry_due on public.youtube_editorial_sources(caption_retry_at)
  where state='needs_review' and capture is null and article_id is null and caption_retry_at is not null;
