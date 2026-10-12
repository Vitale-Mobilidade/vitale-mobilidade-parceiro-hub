create role anon; create role authenticated; create role service_role;
create table public.bikes (bike_id text primary key, name text);
create table public.quiz_leads (id uuid, phone text, created_at timestamptz, clicked_at timestamptz, buy_click_count int, status text, completed_at timestamptz, recommended_bike_1 text, recommended_bike_2 text);
create table public.quiz_events (created_at timestamptz, event_name text, field_value text);
create table public.quiz_funnel_sessions (first_seen_at timestamptz, last_activity_at timestamptz, page_viewed_at timestamptz, started_at timestamptz, lead_form_reached_at timestamptz, completed_at timestamptz, highest_answered_step int);
