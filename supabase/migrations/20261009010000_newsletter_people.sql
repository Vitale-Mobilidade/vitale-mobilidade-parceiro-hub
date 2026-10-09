BEGIN;
ALTER TABLE public.newsletter_webhook_events ADD COLUMN recipient_emails text[] NOT NULL DEFAULT '{}';
CREATE OR REPLACE FUNCTION public.newsletter_record_event(p_id text,p_type text,p_emails text[],p_contact text,p_occurred timestamptz,p_broadcast text DEFAULT NULL,p_email_id text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO newsletter_webhook_events(event_id,event_type,campaign_id,email_id,recipient_emails) VALUES(p_id,p_type,(SELECT id FROM newsletter_campaigns WHERE resend_id=p_broadcast),p_email_id,COALESCE(p_emails,'{}'::text[])) ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN RETURN false; END IF;
 IF p_type IN ('contact.updated','email.complained','email.bounced') THEN
  UPDATE newsletter_subscriptions SET status='unsubscribed',delivery_enabled=false,suppressed_at=now()
  WHERE resend_contact_id IS NOT NULL AND consent_at<=p_occurred
    AND ((p_contact IS NOT NULL AND resend_contact_id=p_contact) OR email=ANY(p_emails));
 END IF;
 IF p_type='email.complained' THEN
  UPDATE newsletter_settings SET enabled=false,last_error='spam_complaint' WHERE singleton;
 END IF;
 RETURN true;
END $$;


CREATE FUNCTION public.newsletter_people(p_filter text DEFAULT 'all', p_campaign uuid DEFAULT NULL, p_page integer DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF p_page < 0 OR p_page > 100000 OR p_filter NOT IN ('all','eligible','legacy','suppressed','recipients','delivered','failed','unknown') OR
 (p_campaign IS NULL AND p_filter IN ('recipients','delivered','failed','unknown')) OR
 (p_campaign IS NOT NULL AND p_filter NOT IN ('recipients','delivered','failed','unknown')) THEN RAISE EXCEPTION 'invalid_filter'; END IF;
 WITH people AS (
 SELECT s.id,s.person_name,s.email,s.created_at,
 CASE WHEN s.status='unsubscribed' OR s.suppressed_at IS NOT NULL THEN 'suppressed' WHEN s.consent_version<>'v2' THEN 'legacy' ELSE 'eligible' END AS subscription_status,
 CASE WHEN p_campaign IS NULL THEN NULL
 WHEN EXISTS (SELECT 1 FROM newsletter_webhook_events e WHERE e.campaign_id=p_campaign AND e.event_type IN ('email.bounced','email.failed','email.complained') AND s.email=ANY(e.recipient_emails)) THEN 'failed'
 WHEN EXISTS (SELECT 1 FROM newsletter_webhook_events e WHERE e.campaign_id=p_campaign AND e.event_type='email.delivered' AND s.email=ANY(e.recipient_emails)) THEN 'delivered'
 ELSE 'unknown' END AS delivery_status
 FROM newsletter_subscriptions s
 WHERE (p_campaign IS NULL OR EXISTS (SELECT 1 FROM newsletter_recipients r WHERE r.campaign_id=p_campaign AND r.subscription_id=s.id AND NOT r.excluded))
 AND (p_campaign IS NOT NULL OR p_filter='all' OR
 (p_filter='eligible' AND s.status='interested' AND s.consent_version='v2' AND s.suppressed_at IS NULL) OR
 (p_filter='legacy' AND s.consent_version<>'v2') OR (p_filter='suppressed' AND s.status='unsubscribed'))
 ), filtered AS (SELECT * FROM people WHERE p_campaign IS NULL OR p_filter='recipients' OR delivery_status=p_filter),
 page AS (SELECT * FROM filtered ORDER BY created_at DESC,id LIMIT 25 OFFSET p_page*25)
 SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'rows',COALESCE((SELECT jsonb_agg(row_to_json(page)) FROM page),'[]'::jsonb),'page',p_page) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.newsletter_people(text,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.newsletter_people(text,uuid,integer) TO service_role;
COMMIT;
