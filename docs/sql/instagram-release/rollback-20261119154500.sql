CREATE OR REPLACE FUNCTION public.dispatch_instagram_single_tick()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE issued text; sig text; local_minute text := to_char(now() AT TIME ZONE 'America/Sao_Paulo','HH24:MI');
BEGIN
 IF local_minute NOT IN ('06:15','11:45','17:45')
 OR NOT EXISTS (SELECT 1 FROM public.instagram_single_settings WHERE singleton AND automation_enabled) THEN RETURN NULL; END IF;
 issued := floor(extract(epoch FROM clock_timestamp()))::bigint::text;
 SELECT encode(extensions.hmac(convert_to(issued || ':instagram-single-tick','UTF8'),signing_key,'sha256'),'hex') INTO sig
 FROM public.podcast_worker_credentials WHERE singleton;
 IF sig IS NULL THEN RETURN NULL; END IF;
 RETURN net.http_post(url:='https://ipectfejftfcikvozoyu.supabase.co/functions/v1/editorial-admin',
 headers:=jsonb_build_object('Content-Type','application/json','x-instagram-single-signature',sig,'x-instagram-single-issued',issued),
 body:=jsonb_build_object('action','instagram-single-tick'),timeout_milliseconds:=110000);
END $function$

DO $$ DECLARE first_job bigint; second_job bigint; BEGIN
 SELECT jobid INTO STRICT first_job FROM cron.job WHERE jobname='vitale-instagram-single-morning';
 SELECT jobid INTO STRICT second_job FROM cron.job WHERE jobname='vitale-instagram-single-midday-evening';
 PERFORM cron.alter_job(first_job, schedule := '15 9 * * *', active := true);
 PERFORM cron.alter_job(second_job, schedule := '45 14,20 * * *', active := true);
END $$;

