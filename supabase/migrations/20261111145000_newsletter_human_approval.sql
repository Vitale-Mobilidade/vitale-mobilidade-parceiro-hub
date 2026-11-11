-- Bind human approval to the reviewed revision and allow a bounded same-day recovery.
BEGIN;
ALTER TABLE public.newsletter_drafts
 ADD COLUMN approved_revision integer,
 ADD COLUMN approved_by uuid,
 ADD COLUMN approved_at timestamptz,
 ADD COLUMN manual_send_until timestamptz,
 ADD CONSTRAINT newsletter_draft_approval_complete CHECK (
   (approved_revision IS NULL AND approved_by IS NULL AND approved_at IS NULL AND manual_send_until IS NULL)
   OR (edition_day IS NOT NULL AND approved_revision IS NOT NULL AND approved_revision BETWEEN 1 AND revision
       AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
 );
ALTER TABLE public.newsletter_campaigns ADD COLUMN manual_send_until timestamptz;

CREATE OR REPLACE FUNCTION public.newsletter_form_campaign(p_day date,p_segment text,p_payload jsonb,p_fingerprint text,tok uuid,p_clock timestamptz DEFAULT now()) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE campaign uuid; state text; manual_until timestamptz; resumed_after uuid; BEGIN
 IF NOT EXISTS(SELECT 1 FROM newsletter_settings WHERE singleton AND enabled AND lease_token=tok AND lease_until>now()) THEN RAISE EXCEPTION 'worker_not_authorized'; END IF;
 IF p_payload->>'generationMode' = 'human' THEN
   SELECT CASE WHEN d.manual_send_until > now()
       AND p_day = (now() AT TIME ZONE 'America/Sao_Paulo')::date
       THEN d.manual_send_until END
   INTO manual_until
   FROM newsletter_drafts d
   WHERE d.edition_day=p_day AND d.approved_revision=d.revision
     AND to_jsonb(d.revision)=p_payload->'approvedRevision'
     AND d.fingerprint=p_fingerprint AND d.content=p_payload->'content';
   IF NOT FOUND THEN RAISE EXCEPTION 'newsletter_approval_conflict'; END IF;
 END IF;
 IF manual_until IS NULL AND (
    p_day<>(p_clock AT TIME ZONE 'America/Sao_Paulo')::date OR extract(isodow FROM p_day) NOT IN (1,3,5)
    OR (p_clock AT TIME ZONE 'America/Sao_Paulo')::time < time '06:30'
    OR (p_clock AT TIME ZONE 'America/Sao_Paulo')::time >= time '08:30'
 ) THEN RAISE EXCEPTION 'outside_window'; END IF;
 IF p_segment<>'general' THEN RETURN NULL; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('vitale-newsletter:'||p_day::text));
 SELECT id INTO campaign FROM newsletter_campaigns WHERE edition_day=p_day ORDER BY created_at LIMIT 1;
 IF campaign IS NOT NULL THEN RETURN campaign; END IF;
 IF NOT EXISTS(SELECT 1 FROM newsletter_subscriptions WHERE status='interested' AND delivery_enabled AND consent_version='v2' AND suppressed_at IS NULL) THEN RETURN NULL; END IF;
 -- Restore the regular Friday slot only after the confirmed, manually recovered edition #14.
 IF p_day = DATE '2026-11-13' THEN
   SELECT c.id INTO resumed_after FROM newsletter_campaigns c
   WHERE c.edition_day=DATE '2026-11-11' AND c.segment='general' AND c.status='sent'
     AND c.sent_at IS NOT NULL AND c.manual_send_until IS NOT NULL
     AND c.payload->>'generationMode'='human'
     AND c.payload->'content'->>'editionNumber'='14';
 END IF;
 IF EXISTS(SELECT 1 FROM newsletter_campaigns c WHERE c.id IS DISTINCT FROM resumed_after
   AND c.status IN ('submitted','sent','submitting','uncertain') AND COALESCE(c.submitted_at,c.created_at)>p_clock-interval '46 hours') THEN RETURN NULL; END IF;
 state:='syncing';
 IF p_fingerprint=(SELECT fingerprint FROM newsletter_campaigns WHERE status IN ('submitted','sent') ORDER BY edition_day DESC LIMIT 1) THEN state:='skipped'; END IF;
 INSERT INTO newsletter_campaigns(edition_day,segment,payload,fingerprint,status,manual_send_until) VALUES(p_day,p_segment,p_payload,p_fingerprint,state,manual_until) RETURNING id INTO campaign;
 IF state='skipped' THEN RETURN campaign; END IF;
 INSERT INTO newsletter_recipients(campaign_id,subscription_id,edition_day,consent_at)
 SELECT campaign,s.id,p_day,s.consent_at FROM newsletter_subscriptions s
 WHERE s.status='interested' AND s.delivery_enabled AND s.consent_version='v2' AND s.suppressed_at IS NULL
 AND NOT EXISTS(SELECT 1 FROM newsletter_recipients r JOIN newsletter_campaigns c ON c.id=r.campaign_id WHERE r.subscription_id=s.id AND NOT r.excluded AND c.id IS DISTINCT FROM resumed_after
  AND (c.status IN ('submitted','sent','submitting','uncertain') AND COALESCE(c.submitted_at,c.created_at)>p_clock-interval '46 hours'));
 IF NOT FOUND THEN UPDATE newsletter_campaigns SET status='skipped',last_error='no_eligible_recipients' WHERE id=campaign; END IF;
 RETURN campaign;
END $$;

COMMIT;
