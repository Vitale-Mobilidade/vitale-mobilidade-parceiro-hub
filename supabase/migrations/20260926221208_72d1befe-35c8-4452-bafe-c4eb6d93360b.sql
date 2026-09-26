CREATE TABLE public.quiz_funnel_sessions (
  session_id uuid PRIMARY KEY,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  page_viewed_at timestamptz,
  started_at timestamptz,
  highest_answered_step smallint NOT NULL DEFAULT 0 CHECK (highest_answered_step BETWEEN 0 AND 7),
  lead_form_reached_at timestamptz,
  completed_at timestamptz,
  landing_path text,
  referrer_domain text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  device_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.quiz_funnel_sessions TO service_role;
REVOKE ALL ON public.quiz_funnel_sessions FROM anon, authenticated;
ALTER TABLE public.quiz_funnel_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX quiz_funnel_sessions_first_seen_idx ON public.quiz_funnel_sessions (first_seen_at);
CREATE INDEX quiz_funnel_sessions_last_activity_idx ON public.quiz_funnel_sessions (last_activity_at);
CREATE INDEX quiz_funnel_sessions_completed_idx ON public.quiz_funnel_sessions (completed_at) WHERE completed_at IS NOT NULL;
CREATE TRIGGER quiz_funnel_sessions_updated_at BEFORE UPDATE ON public.quiz_funnel_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.track_quiz_funnel_session(
  p_session_id uuid, p_event text, p_step integer DEFAULT NULL,
  p_path text DEFAULT NULL, p_referrer text DEFAULT NULL, p_device text DEFAULT NULL,
  p_utm_source text DEFAULT NULL, p_utm_medium text DEFAULT NULL, p_utm_campaign text DEFAULT NULL,
  p_utm_content text DEFAULT NULL, p_utm_term text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_step smallint := 0;
  v_started timestamptz; v_form timestamptz; v_done timestamptz; v_page timestamptz;
BEGIN
  IF p_session_id IS NULL THEN RAISE EXCEPTION 'session_id required'; END IF;
  IF p_event NOT IN ('page_view','quiz_started','question_answered','lead_form_reached','quiz_completed') THEN
    RAISE EXCEPTION 'invalid event %', p_event;
  END IF;
  IF p_event = 'question_answered' THEN
    IF p_step IS NULL OR p_step < 1 OR p_step > 7 THEN RAISE EXCEPTION 'invalid step'; END IF;
    v_step := p_step;
  END IF;
  -- Estágios posteriores implicam os anteriores (funil monotônico).
  IF p_event = 'page_view' THEN v_page := v_now; END IF;
  IF p_event IN ('quiz_started','question_answered','lead_form_reached','quiz_completed') THEN v_started := v_now; END IF;
  IF p_event IN ('lead_form_reached','quiz_completed') THEN v_step := 7; v_form := v_now; END IF;
  IF p_event = 'quiz_completed' THEN v_done := v_now; END IF;

  INSERT INTO public.quiz_funnel_sessions AS t (
    session_id, first_seen_at, last_activity_at, page_viewed_at, started_at, highest_answered_step,
    lead_form_reached_at, completed_at, landing_path, referrer_domain,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term, device_type)
  VALUES (p_session_id, v_now, v_now, v_page, v_started, v_step, v_form, v_done,
    left(split_part(split_part(p_path, '?', 1), '#', 1), 300), left(lower(p_referrer), 120),
    left(p_utm_source,120), left(p_utm_medium,120), left(p_utm_campaign,160), left(p_utm_content,160), left(p_utm_term,160),
    left(p_device, 20))
  ON CONFLICT (session_id) DO UPDATE SET
    last_activity_at = greatest(t.last_activity_at, EXCLUDED.last_activity_at),
    page_viewed_at = coalesce(t.page_viewed_at, EXCLUDED.page_viewed_at),
    started_at = coalesce(t.started_at, EXCLUDED.started_at),
    highest_answered_step = greatest(t.highest_answered_step, EXCLUDED.highest_answered_step),
    lead_form_reached_at = coalesce(t.lead_form_reached_at, EXCLUDED.lead_form_reached_at),
    completed_at = coalesce(t.completed_at, EXCLUDED.completed_at);
END $$;

CREATE OR REPLACE FUNCTION public.admin_quiz_funnel_metrics(p_since timestamptz)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH c AS (
    SELECT s.*, (s.last_activity_at < now() - interval '30 minutes') AS inactive
    FROM public.quiz_funnel_sessions s WHERE s.first_seen_at >= p_since
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
    FROM public.quiz_leads WHERE created_at >= p_since
  ), clicks AS (
    SELECT coalesce(sum(greatest(1, coalesce(buy_click_count, 0))), 0) AS clicks,
           count(DISTINCT coalesce(nullif(regexp_replace(phone, '\D', '', 'g'), ''), id::text)) AS people
    FROM public.quiz_leads WHERE clicked_at >= p_since
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

REVOKE ALL ON FUNCTION public.track_quiz_funnel_session(uuid, text, integer, text, text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_quiz_funnel_metrics(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_quiz_funnel_session(uuid, text, integer, text, text, text, text, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_quiz_funnel_metrics(timestamptz) TO service_role;