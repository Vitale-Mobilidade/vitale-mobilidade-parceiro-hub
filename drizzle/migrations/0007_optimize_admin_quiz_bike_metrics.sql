-- Keep the unchanged Admin Growth aggregate within the Edge/PostgREST statement
-- timeout. The Lovable SQL executor is transactional, so use short lock and
-- execution limits: fail and roll back instead of waiting on Quiz writers.
set local lock_timeout = '2s';
set local statement_timeout = '60s';

create index quiz_leads_admin_bike_metrics_idx
  on public.quiz_leads (completed_at)
  include (recommended_bike_1, recommended_bike_2)
  where status = 'completo';

create index quiz_events_admin_bike_metrics_idx
  on public.quiz_events (created_at)
  include (field_value)
  where event_name in ('buy_button_clicked', 'secondary_option_clicked')
    and field_value ~ '^[a-z0-9_]{1,64}$';
