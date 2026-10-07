-- Discover videos after the successful canonical bike sync, rather than waiting for HH:12.
-- Existing HH:12 discovery remains a recovery path; the worker's leases prevent duplicate generation.
create or replace function public.enqueue_youtube_after_bike_sync()
returns trigger language plpgsql security definer set search_path=public,extensions as $$
begin
  begin
    perform public.dispatch_youtube_editorial_tick('youtube-hourly');
  exception when others then
    -- Editorial transport must not roll back the commercial bike sync.
    raise warning 'youtube_after_bike_sync_dispatch_failed: %', SQLSTATE;
  end;
  return new;
end $$;
revoke all on function public.enqueue_youtube_after_bike_sync() from public,anon,authenticated,service_role;

drop trigger if exists enqueue_youtube_after_bike_sync on public.bike_catalog_sync_state;
create trigger enqueue_youtube_after_bike_sync
  after update of last_success_at on public.bike_catalog_sync_state
  for each row
  when (new.id='current' and new.status='ok' and new.last_success_at is not null
    and new.last_success_at is distinct from old.last_success_at)
  execute function public.enqueue_youtube_after_bike_sync();
