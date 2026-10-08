-- Additive JSON contract for Admin Growth recommendation metrics.
-- The original tabular RPC stays available as an immediate Edge rollback target.
create function public.admin_quiz_bike_metrics_json(p_since timestamptz)
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
  from public.admin_quiz_bike_metrics(p_since) metrics;
$$;

revoke all on function public.admin_quiz_bike_metrics_json(timestamptz) from public, anon, authenticated;
grant execute on function public.admin_quiz_bike_metrics_json(timestamptz) to service_role;
