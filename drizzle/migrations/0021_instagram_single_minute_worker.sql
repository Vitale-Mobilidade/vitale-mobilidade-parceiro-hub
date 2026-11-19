-- Reuse the existing authenticated dispatch and jobs. Manual times need a minute-resolution worker.
CREATE OR REPLACE FUNCTION public.dispatch_instagram_single_tick()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE issued text; sig text;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.instagram_single_settings WHERE singleton AND automation_enabled)
 THEN RETURN NULL; END IF;
 issued := floor(extract(epoch FROM clock_timestamp()))::bigint::text;
 SELECT encode(extensions.hmac(convert_to(issued || ':instagram-single-tick','UTF8'),signing_key,'sha256'),'hex') INTO sig
 FROM public.podcast_worker_credentials WHERE singleton;
 IF sig IS NULL THEN RETURN NULL; END IF;
 RETURN net.http_post(
   url := 'https://ipectfejftfcikvozoyu.supabase.co/functions/v1/editorial-admin',
   headers := jsonb_build_object('Content-Type','application/json','x-instagram-single-signature',sig,'x-instagram-single-issued',issued),
   body := jsonb_build_object('action','instagram-single-tick'),
   timeout_milliseconds := 110000
 );
END $$;

DO $$
DECLARE worker bigint; redundant bigint;
BEGIN
 SELECT jobid INTO STRICT worker FROM cron.job WHERE jobname='vitale-instagram-single-morning';
 SELECT jobid INTO STRICT redundant FROM cron.job WHERE jobname='vitale-instagram-single-midday-evening';
 PERFORM cron.alter_job(worker, schedule := '* * * * *', active := true);
 PERFORM cron.alter_job(redundant, active := false);
END $$;
