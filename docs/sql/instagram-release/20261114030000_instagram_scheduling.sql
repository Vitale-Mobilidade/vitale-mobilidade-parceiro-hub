-- PENDING; do not apply or register journals during preparation.
ALTER TABLE public.instagram_carousel_settings ADD COLUMN scheduling_enabled boolean NOT NULL DEFAULT false;
CREATE TABLE public.instagram_carousel_schedules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),job_id uuid NOT NULL REFERENCES public.instagram_carousel_jobs(id),
 revision integer NOT NULL,fingerprint text NOT NULL,actor_id uuid NOT NULL,due_at timestamptz NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','running','cancelled','published','blocked','uncertain')),
 lease_token uuid,lease_until timestamptz,error_code text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(job_id,revision)
);
GRANT ALL ON public.instagram_carousel_schedules TO service_role;
ALTER TABLE public.instagram_carousel_schedules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.instagram_carousel_schedules FROM PUBLIC,anon,authenticated;
CREATE INDEX instagram_schedule_due ON public.instagram_carousel_schedules(due_at) WHERE state='pending';
CREATE FUNCTION public.manage_instagram_schedule(p_job uuid,p_revision integer,p_actor uuid,p_due timestamptz,p_fingerprint text,p_cancel boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j public.instagram_carousel_jobs; s public.instagram_carousel_schedules; result uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.editorial_admin_memberships WHERE user_id=p_actor AND active AND role='admin') THEN RAISE EXCEPTION 'admin_required'; END IF;
 SELECT * INTO j FROM public.instagram_carousel_jobs WHERE id=p_job FOR UPDATE;
 IF NOT FOUND OR j.revision<>p_revision OR j.publish_attempted OR j.state<>'approved' OR j.approved_revision<>j.revision OR j.approved_by IS NULL OR j.lease_until>now() THEN RAISE EXCEPTION 'revision_busy_or_unapproved'; END IF;
 SELECT * INTO s FROM public.instagram_carousel_schedules WHERE job_id=p_job AND revision=p_revision FOR UPDATE;
 IF s.state IN ('running','published','uncertain') THEN RAISE EXCEPTION 'schedule_started'; END IF;
 IF p_cancel THEN
  UPDATE public.instagram_carousel_schedules SET state='cancelled',updated_at=now() WHERE id=s.id AND state='pending' RETURNING id INTO result;
  IF result IS NULL THEN RAISE EXCEPTION 'schedule_not_pending'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM public.instagram_carousel_settings WHERE singleton AND scheduling_enabled AND publishing_enabled AND paused_reason IS NULL) THEN RAISE EXCEPTION 'scheduling_disabled'; END IF;
  IF p_due<=now() OR p_fingerprint !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'schedule_invalid'; END IF;
  INSERT INTO public.instagram_carousel_schedules(job_id,revision,actor_id,due_at,fingerprint)
   VALUES(p_job,p_revision,p_actor,p_due,p_fingerprint)
   ON CONFLICT(job_id,revision) DO UPDATE SET due_at=excluded.due_at,fingerprint=excluded.fingerprint,actor_id=excluded.actor_id,state='pending',error_code=NULL,updated_at=now()
   RETURNING id INTO result;
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.manage_instagram_schedule(uuid,integer,uuid,timestamptz,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.manage_instagram_schedule(uuid,integer,uuid,timestamptz,text,boolean) TO service_role;
CREATE FUNCTION public.claim_instagram_schedule(p_token uuid)
RETURNS SETOF public.instagram_carousel_schedules LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.instagram_carousel_settings WHERE singleton AND scheduling_enabled AND publishing_enabled AND paused_reason IS NULL) THEN RETURN; END IF;
 -- A crashed run is never automatically replayed, including before Meta's response.
 UPDATE public.instagram_carousel_schedules SET state='uncertain',error_code='schedule_lease_expired',updated_at=now() WHERE state='running' AND lease_until<now();
 RETURN QUERY UPDATE public.instagram_carousel_schedules SET state='running',lease_token=p_token,lease_until=now()+interval '15 minutes',updated_at=now()
 WHERE id=(SELECT id FROM public.instagram_carousel_schedules WHERE state='pending' AND due_at<=now() ORDER BY due_at,id FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *;
END $$;
REVOKE ALL ON FUNCTION public.claim_instagram_schedule(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_instagram_schedule(uuid) TO service_role;