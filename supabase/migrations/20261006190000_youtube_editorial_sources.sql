-- Private original caption evidence and exclusive per-video reservation. No cron activation here.
create table public.youtube_editorial_sources (
  video_id text primary key check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  state text not null check (state in ('capturing', 'generating', 'done', 'needs_review')),
  capture jsonb,
  captured_at timestamptz,
  article_id uuid references public.editorial_articles(id) on delete set null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.youtube_editorial_sources enable row level security;
revoke all on public.youtube_editorial_sources from anon, authenticated;
grant all on public.youtube_editorial_sources to service_role;
comment on table public.youtube_editorial_sources is 'Private captions; no public/client access. Interrupted runs require reconciliation before retry.';

-- Inventory excludes existing historical rows but allows an explicitly selected Admin pilot.
create table public.youtube_editorial_inventory (
  video_id text primary key check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  historical boolean not null,
  created_at timestamptz not null default now()
);
create table public.youtube_editorial_snapshot_state (
  singleton boolean primary key default true check (singleton),
  initialized boolean not null default false
);
insert into public.youtube_editorial_snapshot_state(singleton) values (true);
alter table public.youtube_editorial_inventory enable row level security;
alter table public.youtube_editorial_snapshot_state enable row level security;
revoke all on public.youtube_editorial_inventory, public.youtube_editorial_snapshot_state from anon, authenticated;
grant all on public.youtube_editorial_inventory, public.youtube_editorial_snapshot_state to service_role;

create function public.ingest_youtube_editorial_snapshot(video_ids text[]) returns text
language plpgsql security definer set search_path = public as $$
declare first_snapshot boolean; candidate text;
begin
  if cardinality(video_ids) = 0 or video_ids is null or exists (
    select 1 from unnest(video_ids) v where v is null or v !~ '^[A-Za-z0-9_-]{11}$'
  ) then raise exception 'invalid_snapshot'; end if;
  select not initialized into first_snapshot from youtube_editorial_snapshot_state where singleton for update;
  insert into youtube_editorial_inventory(video_id, historical)
    select distinct v, first_snapshot from unnest(video_ids) v on conflict (video_id) do nothing;
  update youtube_editorial_snapshot_state set initialized = true where singleton;
  if first_snapshot then return null; end if;
  select i.video_id into candidate from youtube_editorial_inventory i
    where not i.historical and i.video_id = any(video_ids)
      and not exists (select 1 from youtube_editorial_sources s where s.video_id = i.video_id)
      and not exists (select 1 from editorial_articles a where a.video_id = i.video_id and a.status <> 'archived')
    order by i.created_at, i.video_id limit 1;
  return candidate;
end $$;
revoke all on function public.ingest_youtube_editorial_snapshot(text[]) from public, anon, authenticated;
grant execute on function public.ingest_youtube_editorial_snapshot(text[]) to service_role;

-- Existing production inventory checked: no duplicate active video IDs on 2026-10-06.
create unique index editorial_articles_one_active_video
  on public.editorial_articles(video_id) where status <> 'archived';
