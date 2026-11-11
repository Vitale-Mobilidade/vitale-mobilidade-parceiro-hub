-- Run only in a disposable database after the newsletter migrations.
BEGIN;
INSERT INTO editorial_admin_memberships(user_id,role,active)
VALUES ('00000000-0000-4000-8000-000000000001','admin',true);
SELECT newsletter_set_enabled(true,'00000000-0000-4000-8000-000000000001');
INSERT INTO newsletter_subscriptions(person_name,email,consent_text,consent_version) VALUES
 ('Eligible','eligible@example.test','Consent','v2'),
 ('Legacy','legacy@example.test','Consent','v1');
DO $$
DECLARE
  day date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  scheduled_day date := DATE '2026-11-13';
  outside_clock timestamptz := (day + time '19:00') AT TIME ZONE 'America/Sao_Paulo';
  tok uuid := newsletter_acquire();
  actor constant uuid := '00000000-0000-4000-8000-000000000001';
  copy constant jsonb := '{"subject":"Revisão aprovada"}';
  payload jsonb := jsonb_build_object('content',copy,'generationMode','human','approvedRevision',1);
  campaign uuid;
BEGIN
  INSERT INTO newsletter_drafts(edition_day,fingerprint,origin,generation_mode,content)
    VALUES(day,'manual','agent','fallback',copy);
  BEGIN
    PERFORM newsletter_form_campaign(day,'general',payload,'manual',tok,outside_clock);
    RAISE EXCEPTION 'accepted unapproved draft';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'newsletter_approval_conflict' THEN RAISE; END IF;
  END;
  UPDATE newsletter_drafts SET approved_revision=1,approved_by=actor,approved_at=now() WHERE edition_day=day;
  BEGIN
    PERFORM newsletter_form_campaign(day,'general',payload,'manual',tok,outside_clock);
    RAISE EXCEPTION 'ordinary approval opened a manual window';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'outside_window' THEN RAISE; END IF;
  END;
  UPDATE newsletter_drafts SET manual_send_until=now()-interval '1 second' WHERE edition_day=day;
  BEGIN
    PERFORM newsletter_form_campaign(day,'general',payload,'manual',tok,outside_clock);
    RAISE EXCEPTION 'accepted expired manual window';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'outside_window' THEN RAISE; END IF;
  END;
  UPDATE newsletter_drafts SET manual_send_until=now()+interval '30 minutes',revision=2 WHERE edition_day=day;
  BEGIN
    PERFORM newsletter_form_campaign(day,'general',payload,'manual',tok,outside_clock);
    RAISE EXCEPTION 'accepted stale approval';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'newsletter_approval_conflict' THEN RAISE; END IF;
  END;
  UPDATE newsletter_drafts SET approved_revision=2 WHERE edition_day=day;
  payload := jsonb_set(payload,'{approvedRevision}','2');
  BEGIN
    PERFORM newsletter_form_campaign(day,'general',jsonb_set(payload,'{content}','{}'),'manual',tok,outside_clock);
    RAISE EXCEPTION 'accepted modified copy';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'newsletter_approval_conflict' THEN RAISE; END IF;
  END;
  campaign := newsletter_form_campaign(day,'general',payload,'manual',tok,outside_clock);
  IF campaign IS NULL OR NOT EXISTS(
    SELECT 1 FROM newsletter_campaigns WHERE id=campaign AND status='syncing' AND manual_send_until>now()
  ) THEN RAISE EXCEPTION 'manual campaign missing'; END IF;
  IF (SELECT count(*) FROM newsletter_recipients WHERE campaign_id=campaign) <> 1 THEN
    RAISE EXCEPTION 'wrong consent snapshot';
  END IF;
  IF newsletter_form_campaign(day,'general',payload,'manual',tok,outside_clock) IS DISTINCT FROM campaign THEN
    RAISE EXCEPTION 'retry changed campaign ID';
  END IF;
  IF scheduled_day=day THEN scheduled_day := scheduled_day+3; END IF;
  campaign := newsletter_form_campaign(
    scheduled_day,'general','{"generationMode":"agent"}','regular',tok,
    (scheduled_day + time '06:30') AT TIME ZONE 'America/Sao_Paulo'
  );
  IF campaign IS NULL OR NOT EXISTS(SELECT 1 FROM newsletter_campaigns WHERE id=campaign AND manual_send_until IS NULL) THEN
    RAISE EXCEPTION 'ordinary campaign missing';
  END IF;
  IF has_function_privilege('anon','newsletter_form_campaign(date,text,jsonb,text,uuid,timestamptz)','EXECUTE') OR
     has_table_privilege('authenticated','newsletter_drafts','UPDATE') THEN
    RAISE EXCEPTION 'browser can write to approval flow';
  END IF;
END $$;
ROLLBACK;
