-- Matches supabase/migrations/20261011210000_admin_growth_range.sql.
set local lock_timeout = '2s';
set local statement_timeout = '60s';
-- Additive read-only range RPCs. Existing RPCs preserved for rollback.
create or replace function public.admin_quiz_bike_counts_range(p_since timestamptz, p_until timestamptz)
returns table (
  bike_id text,
  bike_name text,
  primary_recommendations bigint,
  secondary_recommendations bigint,
  quiz_offer_clicks bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with recommendations as (
    select recommended_bike_1 as id, count(*)::bigint as primary_count, 0::bigint as secondary_count
    from public.quiz_leads
    where status = 'completo' and completed_at >= p_since and completed_at < p_until and recommended_bike_1 ~ '^[a-z0-9_]{1,64}$'
    group by recommended_bike_1
    union all
    select recommended_bike_2 as id, 0::bigint, count(*)::bigint
    from public.quiz_leads
    where status = 'completo' and completed_at >= p_since and completed_at < p_until and recommended_bike_2 ~ '^[a-z0-9_]{1,64}$'
    group by recommended_bike_2
  ), rec as (
    select id, sum(primary_count)::bigint as primary_count, sum(secondary_count)::bigint as secondary_count
    from recommendations group by id
  ), clicks as (
    select field_value as id, count(*)::bigint as click_count
    from public.quiz_events
    where created_at >= p_since and created_at < p_until
      and event_name in ('buy_button_clicked', 'secondary_option_clicked')
      and field_value ~ '^[a-z0-9_]{1,64}$'
    group by field_value
  ), ids as (
    select id from rec union select id from clicks
  )
  select ids.id,
         coalesce(b.name, ids.id),
         coalesce(rec.primary_count, 0),
         coalesce(rec.secondary_count, 0),
         coalesce(clicks.click_count, 0)
  from ids
  left join public.bikes b on b.bike_id = ids.id
  left join rec on rec.id = ids.id
  left join clicks on clicks.id = ids.id
  order by coalesce(rec.primary_count, 0) + coalesce(rec.secondary_count, 0) desc, ids.id;
$$;

revoke all on function public.admin_quiz_bike_counts_range(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_quiz_bike_counts_range(timestamptz, timestamptz) to service_role;

-- Additive JSON contract for Admin Growth recommendation metrics.
-- The original tabular RPC stays available as an immediate Edge rollback target.
create or replace function public.admin_quiz_bikes_range(p_since timestamptz, p_until timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'bikes',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'bikeId', metrics.bike_id,
          'name', metrics.bike_name,
          'primaryRecommendations', metrics.primary_recommendations,
          'secondaryRecommendations', metrics.secondary_recommendations,
          'quizOfferClicks', metrics.quiz_offer_clicks
        )
        order by
          metrics.primary_recommendations + metrics.secondary_recommendations desc,
          metrics.bike_id
      ),
      '[]'::jsonb
    )
  )
  from public.admin_quiz_bike_counts_range(p_since, p_until) metrics;
$$;

revoke all on function public.admin_quiz_bikes_range(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_quiz_bikes_range(timestamptz, timestamptz) to service_role;
create or replace function public.admin_site_analytics_range(p_since date, p_until date)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with scoped as (
    select * from public.site_analytics_daily where day >= p_since and day < p_until
  ), page_totals as (
    select source_path, sum(event_count)::bigint as count
    from scoped where event_name = 'page_view' group by source_path
  ), page_clicks as (
    select source_path,
      coalesce(sum(event_count) filter (where event_name = 'page_view'), 0) as views,
      coalesce(sum(event_count) filter (where event_name = 'bike_click'), 0) as detail_clicks,
      coalesce(sum(event_count) filter (where event_name = 'affiliate_click'), 0) as offer_clicks
    from scoped group by source_path
    having coalesce(sum(event_count) filter (where event_name in ('bike_click', 'affiliate_click')), 0) > 0
  ), bike_totals as (
    select bike_id,
           (sum(event_count) filter (where event_name = 'bike_click'))::bigint as detail_clicks,
           (sum(event_count) filter (where event_name = 'affiliate_click'))::bigint as offer_clicks
    from scoped where bike_id <> '' group by bike_id
  ), bike_origins as (
    select bike_id, source_path,
           (sum(event_count) filter (where event_name = 'bike_click'))::bigint as detail_clicks,
           (sum(event_count) filter (where event_name = 'affiliate_click'))::bigint as offer_clicks
    from scoped where bike_id <> '' group by bike_id, source_path
  )
  select jsonb_build_object(
    'coverageSince', (select min(day) from public.site_analytics_daily),
    'pageViews', coalesce((select sum(event_count) from scoped where event_name = 'page_view'), 0),
    'bikeClicks', coalesce((select sum(event_count) from scoped where event_name = 'bike_click'), 0),
    'affiliateClicks', coalesce((select sum(event_count) from scoped where event_name = 'affiliate_click'), 0),
    'pages', coalesce((select jsonb_agg(jsonb_build_object('path', source_path, 'views', count) order by count desc, source_path) from (select * from page_totals order by count desc, source_path limit 20) p), '[]'::jsonb),
    'pageClicks', coalesce((select jsonb_agg(jsonb_build_object('path', source_path, 'views', views, 'detailClicks', detail_clicks, 'offerClicks', offer_clicks) order by offer_clicks desc, detail_clicks desc, source_path) from page_clicks), '[]'::jsonb),
    'bikes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'bikeId', bt.bike_id,
        'name', coalesce(b.name, bt.bike_id),
        'detailClicks', coalesce(bt.detail_clicks, 0),
        'offerClicks', coalesce(bt.offer_clicks, 0),
        'origins', coalesce((
          select jsonb_agg(jsonb_build_object(
            'path', bo.source_path,
            'detailClicks', coalesce(bo.detail_clicks, 0),
            'offerClicks', coalesce(bo.offer_clicks, 0)
          ) order by coalesce(bo.detail_clicks, 0) + coalesce(bo.offer_clicks, 0) desc, bo.source_path)
          from bike_origins bo where bo.bike_id = bt.bike_id
        ), '[]'::jsonb)
      ) order by coalesce(bt.detail_clicks, 0) + coalesce(bt.offer_clicks, 0) desc, bt.bike_id)
      from bike_totals bt left join public.bikes b on b.bike_id = bt.bike_id
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.admin_site_analytics_range(date, date) from public, anon, authenticated;
grant execute on function public.admin_site_analytics_range(date, date) to service_role;
CREATE OR REPLACE FUNCTION public.admin_quiz_funnel_range(p_since timestamptz, p_until timestamptz)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH c AS (
    SELECT s.*, (s.last_activity_at < now() - interval '30 minutes') AS inactive
    FROM public.quiz_funnel_sessions s WHERE s.first_seen_at >= p_since AND s.first_seen_at < p_until
  ), agg AS (
    SELECT
      count(*) FILTER (WHERE page_viewed_at IS NOT NULL) AS visitors,
      count(*) FILTER (WHERE started_at IS NOT NULL) AS started,
      count(*) FILTER (WHERE lead_form_reached_at IS NOT NULL) AS form,
      count(*) FILTER (WHERE completed_at IS NOT NULL) AS done,
      count(*) FILTER (WHERE page_viewed_at IS NOT NULL AND started_at IS NULL AND inactive) AS intro_ab,
      count(*) FILTER (WHERE lead_form_reached_at IS NOT NULL AND completed_at IS NULL AND inactive) AS form_ab
    FROM c
  ), steps AS (
    SELECT jsonb_agg(jsonb_build_object(
      'step', k,
      'reached', (SELECT count(*) FROM c WHERE started_at IS NOT NULL AND highest_answered_step >= k - 1),
      'advanced', (SELECT count(*) FROM c WHERE started_at IS NOT NULL AND highest_answered_step >= k),
      'abandoned', (SELECT count(*) FROM c WHERE started_at IS NOT NULL AND lead_form_reached_at IS NULL
                      AND highest_answered_step = k - 1 AND inactive)
    ) ORDER BY k) AS arr FROM generate_series(1, 7) k
  ), leads AS (
    SELECT count(DISTINCT nullif(regexp_replace(phone, '\D', '', 'g'), '')) AS n
    FROM public.quiz_leads WHERE created_at >= p_since AND created_at < p_until
  ), clicks AS (
    SELECT coalesce(sum(greatest(1, coalesce(buy_click_count, 0))), 0) AS clicks,
           count(DISTINCT coalesce(nullif(regexp_replace(phone, '\D', '', 'g'), ''), id::text)) AS people
    FROM public.quiz_leads WHERE clicked_at >= p_since AND clicked_at < p_until
  )
  SELECT jsonb_build_object(
    'since', p_since,
    'coverageSince', (SELECT min(first_seen_at) FROM public.quiz_funnel_sessions),
    'abandonAfterMinutes', 30,
    'pageVisitors', a.visitors, 'started', a.started, 'leadFormReached', a.form, 'completed', a.done,
    'introAbandoned', a.intro_ab, 'leadFormAbandoned', a.form_ab,
    'steps', coalesce(st.arr, '[]'::jsonb),
    'rates', jsonb_build_object(
      'startRate', CASE WHEN a.visitors > 0 THEN round(a.started::numeric / a.visitors, 4) END,
      'formRate', CASE WHEN a.started > 0 THEN round(a.form::numeric / a.started, 4) END,
      'completionRate', CASE WHEN a.started > 0 THEN round(a.done::numeric / a.started, 4) END,
      'formToCompletion', CASE WHEN a.form > 0 THEN round(a.done::numeric / a.form, 4) END),
    'uniqueLeads', l.n, 'purchaseClicks', ck.clicks, 'identifiedClickers', ck.people
  ) FROM agg a, steps st, leads l, clicks ck;
$$;


REVOKE ALL ON FUNCTION public.admin_quiz_funnel_range(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_quiz_funnel_range(timestamptz, timestamptz) TO service_role;
