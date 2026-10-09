-- Mon/Thu; 70h floor accommodates the two-hour window. Prepared, not applied.
BEGIN;
CREATE OR REPLACE FUNCTION public.newsletter_form_campaign(p_day date,p_segment text,p_payload jsonb,p_fingerprint text,tok uuid,p_clock timestamptz DEFAULT now()) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE campaign uuid; state text; BEGIN
 IF NOT EXISTS(SELECT 1 FROM newsletter_settings WHERE singleton AND enabled AND lease_token=tok AND lease_until>now()) THEN RAISE EXCEPTION 'worker_not_authorized'; END IF;
 IF p_day<>(p_clock AT TIME ZONE 'America/Sao_Paulo')::date OR extract(isodow FROM p_day) NOT IN (1,4)
    OR (p_clock AT TIME ZONE 'America/Sao_Paulo')::time < time '06:30' OR (p_clock AT TIME ZONE 'America/Sao_Paulo')::time >= time '08:30' THEN RAISE EXCEPTION 'outside_window'; END IF;
 SELECT id INTO campaign FROM newsletter_campaigns WHERE edition_day=p_day AND segment=p_segment;
 IF campaign IS NOT NULL THEN RETURN campaign; END IF;
 IF NOT EXISTS(SELECT 1 FROM newsletter_subscriptions WHERE status='interested' AND delivery_enabled AND consent_version='v2' AND suppressed_at IS NULL AND interest=p_segment) THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM newsletter_campaigns WHERE segment=p_segment AND status IN ('submitted','sent','submitting','uncertain') AND COALESCE(submitted_at,created_at)>p_clock-interval '70 hours') THEN RETURN NULL; END IF;
 state:='syncing';
 IF p_fingerprint=(SELECT fingerprint FROM newsletter_campaigns WHERE segment=p_segment AND status IN ('submitted','sent') ORDER BY edition_day DESC LIMIT 1) THEN state:='skipped'; END IF;
 INSERT INTO newsletter_campaigns(edition_day,segment,payload,fingerprint,status) VALUES(p_day,p_segment,p_payload,p_fingerprint,state) RETURNING id INTO campaign;
 IF state='skipped' THEN RETURN campaign; END IF;
 INSERT INTO newsletter_recipients(campaign_id,subscription_id,edition_day,consent_at)
 SELECT campaign,s.id,p_day,s.consent_at FROM newsletter_subscriptions s
 WHERE s.status='interested' AND s.delivery_enabled AND s.consent_version='v2' AND s.suppressed_at IS NULL AND s.interest=p_segment
 AND NOT EXISTS(SELECT 1 FROM newsletter_recipients r JOIN newsletter_campaigns c ON c.id=r.campaign_id WHERE r.subscription_id=s.id AND NOT r.excluded
  AND (c.status IN ('submitted','sent','submitting','uncertain') AND COALESCE(c.submitted_at,c.created_at)>p_clock-interval '70 hours'));
 IF NOT FOUND THEN UPDATE newsletter_campaigns SET status='skipped',last_error='no_eligible_recipients' WHERE id=campaign; END IF;
 RETURN campaign;
END $$;

COMMIT;
