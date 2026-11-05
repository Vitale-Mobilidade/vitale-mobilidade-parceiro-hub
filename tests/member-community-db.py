"""Disposable, synthetic PostgreSQL test; never connects to an existing database.

PG_BIN=/path/to/postgresql/bin python3 tests/member-community-db.py
Requires initdb/pg_ctl/psql locally. Unix socket in a private temporary directory;
no TCP listener, Supabase secrets, production data, SMTP or external integrations.
"""
import concurrent.futures
import getpass
import os
from pathlib import Path
import subprocess
import sys
import tempfile

if "--seller" in sys.argv: sys.argv.append("--launch")
if "--google" in sys.argv: sys.argv.append("--identity")
if "--launch" in sys.argv: sys.argv.append("--classifieds")
if "--classifieds" in sys.argv: sys.argv.append("--identity")

repo = Path(__file__).resolve().parents[1]
pg = Path(os.environ.get("PG_BIN", "/opt/homebrew/opt/postgresql@17/bin"))
env = {k: v for k, v in os.environ.items() if not k.startswith("PG")}
with tempfile.TemporaryDirectory(prefix="vitale-member-test-") as directory:
    root = Path(directory)
    data = root / "data"
    subprocess.run([str(pg / "initdb"), "-D", str(data), "-A", "trust", "--no-locale", "--encoding=UTF8"], check=True, env=env, stdout=subprocess.DEVNULL)
    with (data / "postgresql.conf").open("a") as config:
        config.write(f"\nlisten_addresses = ''\nunix_socket_directories = '{root}'\nport = 55439\n")
    subprocess.run([str(pg / "pg_ctl"), "-D", str(data), "-l", str(root / "postgres.log"), "-w", "start"], check=True, env=env, stdout=subprocess.DEVNULL)
    command = [str(pg / "psql"), "-X", "-q", "-h", str(root), "-p", "55439", "-U", getpass.getuser(), "-d", "postgres", "-v", "ON_ERROR_STOP=1"]
    def sql(text):
        return subprocess.run(command, input=text, text=True, capture_output=True, env=env)
    try:
        bootstrap = """
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz, is_anonymous boolean DEFAULT false,raw_user_meta_data jsonb DEFAULT '{}',confirmation_sent_at timestamptz,created_at timestamptz DEFAULT now());
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
CREATE TABLE public.editorial_admin_memberships(user_id uuid PRIMARY KEY, active boolean, role text);
REVOKE ALL ON public.editorial_admin_memberships FROM PUBLIC,anon,authenticated;
CREATE TABLE public.editorial_articles(id uuid PRIMARY KEY, status text, title text, slug text);
INSERT INTO auth.users(id,email,email_confirmed_at,is_anonymous) VALUES
('00000000-0000-4000-8000-000000000001','admin@example.invalid',now(),false),
('00000000-0000-4000-8000-000000000002','a@example.invalid',now(),false),
('00000000-0000-4000-8000-000000000003','b@example.invalid',now(),false),
('00000000-0000-4000-8000-000000000004','unconfirmed@example.invalid',null,false),
('00000000-0000-4000-8000-000000000005',null,now(),true);
INSERT INTO public.editorial_admin_memberships VALUES('00000000-0000-4000-8000-000000000001',true,'admin');
INSERT INTO public.editorial_articles VALUES
('10000000-0000-4000-8000-000000000001','published','Artigo teste','artigo-teste'),
('10000000-0000-4000-8000-000000000002','draft','Rascunho','rascunho');
"""
        for label, content in [
            ("bootstrap", bootstrap),
            ("migration", (repo / "supabase/migrations/20261103180000_member_accounts.sql").read_text()),
            ("contracts", (repo / "tests/member-community.sql").read_text()),
        ]:
            result = sql(content)
            if result.returncode:
                raise RuntimeError(f"{label}: {result.stderr[-3000:]}")
            print(f"PASS {label}")
        concurrent_sql = """
BEGIN;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
SET LOCAL ROLE authenticated;
SELECT public.member_community('add_comment','{"articleId":"10000000-0000-4000-8000-000000000001","body":"Concurrent submission"}');
SELECT pg_sleep(0.2);
COMMIT;
"""
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(sql, [concurrent_sql, concurrent_sql]))
        assert sum(r.returncode == 0 for r in results) == 1, "Concurrent write bypass"
        assert any("comment_rate_limited" in r.stderr for r in results), "Expected rate rejection"
        print("PASS concurrent submissions serialize, exactly one accepted")
        result = sql("SELECT count(*)=1 FROM public.member_article_comments WHERE body='Concurrent submission';")
        assert result.returncode == 0 and " t" in result.stdout, result.stderr
        print("PASS persisted concurrency invariant")
        if "--referrals" in sys.argv or "--community" in sys.argv or "--identity" in sys.argv:
            fixture = (repo / "supabase/migrations/20260925200500_newsletter_interest.sql").read_text() + """
CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
ALTER TABLE public.newsletter_subscriptions ADD COLUMN interest text NOT NULL DEFAULT 'general';
ALTER TABLE public.newsletter_subscriptions ADD COLUMN suppressed_at timestamptz;
CREATE TABLE public.newsletter_settings(singleton boolean PRIMARY KEY DEFAULT true, enabled boolean DEFAULT true, from_email text DEFAULT 'Vitale <newsletter@example.invalid>',signing_key bytea DEFAULT decode(repeat('ab',32),'hex'));
INSERT INTO public.newsletter_settings(singleton) VALUES(true);
CREATE FUNCTION public.newsletter_subscription_delivery() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 NEW.delivery_enabled:= NEW.status='interested' AND NEW.consent_version='v2' AND NEW.suppressed_at IS NULL AND COALESCE((SELECT enabled FROM newsletter_settings WHERE singleton),false);
 RETURN NEW;
END $$;
CREATE TRIGGER newsletter_delivery_gate BEFORE INSERT OR UPDATE ON public.newsletter_subscriptions FOR EACH ROW EXECUTE FUNCTION public.newsletter_subscription_delivery();
"""
            for label, content in [
                ("existing newsletter fixture + real delivery trigger", fixture),
                ("referral migration", (repo / "supabase/migrations/20261103190000_newsletter_referrals.sql").read_text()),
                ("referral contracts", (repo / "tests/newsletter-referrals.sql").read_text()),
            ]:
                result = sql(content)
                if result.returncode:
                    raise RuntimeError(f"{label}: {result.stderr[-3500:]}")
                print(f"PASS {label}")
            # Registration and confirmation both run through actual concurrent connections.
            # Fetch the private code as the owner's authenticated session, then put
            # the constant into each service-side request (no direct table grants).
            code = sql("SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false); SELECT public.member_referrals()->>'code';").stdout.splitlines()[-3].strip()
            assert len(code) == 32, "Missing local referral code"
            registration = "SET ROLE service_role; SELECT public.newsletter_referral_service('register'," + "jsonb_build_object('code','" + code + "','email','race@example.invalid','name','Race','consent',true,'fingerprint',repeat('a',32)));"
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                races = list(executor.map(sql, [registration, registration]))
            assert all(r.returncode == 0 for r in races), str([r.stderr for r in races])
            assert sum('"send": true' in r.stdout for r in races) == 1, "Duplicate confirmation mail allocation"
            token = sql("SELECT encode(extensions.hmac(convert_to('newsletter-referral:'||id::text||':'||nonce::text,'UTF8'),(SELECT signing_key FROM public.newsletter_settings WHERE singleton),'sha256'),'hex') FROM public.member_referral_signups WHERE candidate_email='race@example.invalid';").stdout.splitlines()[-3].strip()
            assert len(token) == 64, "Missing local confirmation token"
            confirmation = "SET ROLE service_role; SELECT public.newsletter_referral_service('confirm',jsonb_build_object('token','" + token + "','fingerprint',repeat('b',32)));"
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                races = list(executor.map(sql, [confirmation, confirmation]))
            assert all(r.returncode == 0 for r in races), str([r.stderr for r in races])
            invariant = sql("SELECT (SELECT count(*) FROM public.newsletter_subscriptions WHERE email='race@example.invalid')=1 AND (SELECT count(*) FROM public.member_referral_signups WHERE email_key=sha256(convert_to('race@example.invalid','UTF8')) AND credited)=1;")
            assert invariant.returncode == 0 and " t" in invariant.stdout, invariant.stderr
            print("PASS concurrent registration sends once; concurrent confirmation subscribes/credits exactly once")
            if "--community" in sys.argv or "--identity" in sys.argv:
                for label, content in [
                    ("community correction migration",(repo / "supabase/migrations/20261103200000_community_membership.sql").read_text()),
                    ("unified community contracts",(repo / "tests/community-membership.sql").read_text()),
                ]:
                    result=sql(content)
                    if result.returncode: raise RuntimeError(f"{label}: {result.stderr[-3500:]}")
                    print(f"PASS {label}")
                join_sql="""
BEGIN;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000011',true);
SET LOCAL ROLE authenticated;
SELECT public.member_community_account('join');
SELECT pg_sleep(0.2);
COMMIT;
"""
                with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                    joins=list(executor.map(sql,[join_sql,join_sql]))
                assert all(r.returncode==0 for r in joins), str([r.stderr for r in joins])
                invariant=sql("SELECT (SELECT count(*) FROM public.newsletter_subscriptions WHERE email='concurrent-member@example.invalid')=1 AND (SELECT count(*) FROM public.member_referral_signups WHERE invitee_user_id='00000000-0000-4000-8000-000000000011' AND community_member AND credited)=1;")
                assert invariant.returncode==0 and " t" in invariant.stdout,invariant.stderr
                print("PASS concurrent first login subscribes and credits one community member exactly once")
                for label,content in [
                    ("immediate access migration",(repo / "supabase/migrations/20261103210000_community_immediate_access.sql").read_text()),
                    ("immediate access and recovery budgets",(repo / "tests/community-immediate-access.sql").read_text()),
                ]:
                    result=sql(content)
                    if result.returncode: raise RuntimeError(f"{label}: {result.stderr[-3500:]}")
                    print(f"PASS {label}")
                reserve="SET ROLE service_role; SELECT public.member_password_recovery_budget('parallel@example.invalid',repeat('c',32));"
                with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                    reservations=list(executor.map(sql,[reserve,reserve]))
                assert all(r.returncode==0 for r in reservations),str([r.stderr for r in reservations])
                assert sum(" t" in r.stdout for r in reservations)==1,"Parallel recovery budget bypass"
                print("PASS parallel recovery attempts serialize at email limit")
                if "--identity" in sys.argv:
                    for label,content in [
                        ("identity migration",(repo / "supabase/migrations/20261103220000_member_identity.sql").read_text()),
                        ("identity security contracts",(repo / "tests/member-identity.sql").read_text()),
                    ]:
                        result=sql(content)
                        if result.returncode: raise RuntimeError(f"{label}: {result.stderr[-3500:]}")
                        print(f"PASS {label}")
                    guesses="SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000013',false); SELECT public.member_identity('verify','{\"channel\":\"email\",\"code\":\"000000\"}');"
                    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                        guesses_result=list(executor.map(sql,[guesses,guesses]))
                    assert all(r.returncode==0 for r in guesses_result),str([r.stderr for r in guesses_result])
                    invariant=sql("SELECT attempts=2 FROM public.member_identity_challenges WHERE user_id='00000000-0000-4000-8000-000000000013' AND channel='email';")
                    assert invariant.returncode==0 and " t" in invariant.stdout,invariant.stderr
                    print("PASS concurrent wrong OTP guesses persist both attempts")


        if "--classifieds" in sys.argv:
            for label,path in [
                ("classifieds storage and owner fixture","tests/bike-classifieds-fixture.sql"),
                ("classifieds pilot migration","supabase/migrations/20261103230000_bike_classifieds_pilot.sql"),
                ("classifieds RLS and publication contracts","tests/bike-classifieds.sql"),
            ]:
                result=sql((repo/path).read_text())
                if result.returncode: raise RuntimeError(f"{label}: {result.stderr[-4000:]}")
                print(f"PASS {label}")
            race="SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000090',false); SELECT public.member_classifieds('reserve_image',jsonb_build_object('id',public.member_classifieds('mine')->0->>'id'));"
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                races=list(executor.map(sql,[race,race]))
            assert sum(r.returncode==0 for r in races)==1, str([r.stderr for r in races])
            assert any("listing_image_limit" in r.stderr for r in races)
            print("PASS concurrent fifth-photo reservation accepts exactly one; five-slot limit persisted")
            invariant=sql("SELECT count(*)=5 FROM public.member_media_assets WHERE kind='listing' AND status<>'removed';")
            assert invariant.returncode==0 and " t" in invariant.stdout,invariant.stderr

        if "--launch" in sys.argv:
            for path in [
                "supabase/migrations/20261104150000_channel_seller_experience.sql",
                "supabase/migrations/20261104180000_asaas_monthly_listings.sql",
                "supabase/migrations/20261104190000_asaas_hosted_checkout.sql",
                "supabase/migrations/20261104200000_asaas_90_day_purchase.sql",
                "supabase/migrations/20261105130000_public_classifieds_launch.sql",
                "tests/public-classifieds-launch.sql",
                "supabase/migrations/20261105140000_admin_channel_classifieds.sql",
                "tests/admin-channel-classifieds.sql",
            ]:
                result = sql((repo / path).read_text())
                if result.returncode: raise RuntimeError(f"{path}: {result.stderr[-3000:]}")
                print(f"PASS {path}")

        if "--seller" in sys.argv:
            for path in ["supabase/migrations/20261105230000_classifieds_seller_experience.sql","tests/classifieds-seller-experience.sql"]:
                result=sql((repo/path).read_text())
                if result.returncode: raise RuntimeError(f"{path}: {result.stderr[-4000:]}")
                print(f"PASS {path}")

            def claim(target):
                return sql("BEGIN; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',false); SELECT public.member_classifieds('claim_period',jsonb_build_object('id','"+target+"','orderId',(public.member_classifieds('periods',jsonb_build_object('id','"+target+"'))->0->>'id'))); SELECT public.member_classifieds('publish',jsonb_build_object('id','"+target+"','contactConsent',true)); COMMIT;")
            targets=["00000000-0000-4000-8000-000000000781","00000000-0000-4000-8000-000000000782"]
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                claims=list(executor.map(claim,targets))
            assert sum(r.returncode==0 for r in claims)==1, str([r.stderr for r in claims])
            invariant=sql("SELECT count(*)=1 FROM public.member_bike_listings WHERE id IN ('00000000-0000-4000-8000-000000000781','00000000-0000-4000-8000-000000000782') AND status='published';")
            assert invariant.returncode==0 and " t" in invariant.stdout,invariant.stderr
            print("PASS concurrent paid-period claim/publication permits exactly one active bike")
            prepare_race=sql("UPDATE public.member_bike_listings SET status='draft' WHERE id=(SELECT listing_id FROM public.member_listing_billing WHERE user_id='00000000-0000-4000-8000-000000000091' LIMIT 1);")
            assert prepare_race.returncode==0,prepare_race.stderr
            claim_observe="SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',false); DO $$ DECLARE t uuid:='00000000-0000-4000-8000-000000000781'; o uuid; BEGIN o:=(public.member_classifieds('periods',jsonb_build_object('id',t))->0->>'id')::uuid; IF o IS NULL THEN t:='00000000-0000-4000-8000-000000000782'; o:=(public.member_classifieds('periods',jsonb_build_object('id',t))->0->>'id')::uuid; END IF; PERFORM public.member_classifieds('claim_period',jsonb_build_object('id',t,'orderId',o)); PERFORM public.member_classifieds('publish',jsonb_build_object('id',t,'contactConsent',true)); END $$;"
            observe="SELECT public.member_billing_record_payment(o.id,(SELECT payment_id FROM public.member_listing_payment_cycles WHERE order_id=o.id LIMIT 1),'CONFIRMED',true,current_date,now()) FROM public.member_listing_billing o;"
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                observed=list(executor.map(sql,[claim_observe,observe]))
            assert all(r.returncode==0 for r in observed),str([r.stderr for r in observed])
            print("PASS concurrent payment observation and transfer serialize without deadlock")
            changed_phone=sql("UPDATE public.member_identity_verifications SET phone_number='+5511999999997' WHERE user_id='00000000-0000-4000-8000-000000000091'; SELECT count(*)=0 FROM public.member_bike_listings WHERE id IN ('00000000-0000-4000-8000-000000000781','00000000-0000-4000-8000-000000000782') AND public.member_listing_visible(id);")
            assert changed_phone.returncode==0 and " t" in changed_phone.stdout,changed_phone.stderr
            pending_changed_phone=sql("UPDATE public.member_bike_listings SET status='draft' WHERE id=(SELECT listing_id FROM public.member_listing_billing WHERE user_id='00000000-0000-4000-8000-000000000091' LIMIT 1); UPDATE public.member_listing_billing o SET publish_requested=true,listing_revision=l.updated_at FROM public.member_bike_listings l WHERE l.id=o.listing_id; SELECT public.member_billing_recalculate(id) FROM public.member_listing_billing; SELECT bool_and(status='active' AND NOT publish_requested AND paid_at IS NOT NULL) FROM public.member_listing_billing;")
            assert pending_changed_phone.returncode==0 and " t" in pending_changed_phone.stdout,pending_changed_phone.stderr
            print("PASS changed phone hides prior contact and paid reconciliation stops auto-publication without losing payment")
            refund=sql("UPDATE public.member_identity_verifications SET phone_number='+5511999999998' WHERE user_id='00000000-0000-4000-8000-000000000091'; UPDATE public.member_bike_listings SET status='published',contact_consent_at=now() WHERE id=(SELECT listing_id FROM public.member_listing_billing WHERE user_id='00000000-0000-4000-8000-000000000091' LIMIT 1); UPDATE public.member_listing_payment_cycles SET status='REFUNDED',paid=false; SELECT public.member_billing_recalculate(id) FROM public.member_listing_billing; SELECT count(*)=0 FROM public.member_bike_listings WHERE id IN ('00000000-0000-4000-8000-000000000781','00000000-0000-4000-8000-000000000782') AND status='published';")
            assert refund.returncode==0 and " t" in refund.stdout,refund.stderr
            print("PASS refund reconciliation withdraws the reassigned bike")
            rollback=sql((repo/"supabase/rollback/20261105230000_classifieds_seller_experience.sql").read_text())
            assert rollback.returncode==0,rollback.stderr
            invariant=sql("SELECT NOT has_function_privilege('anon','public.member_listing_track(uuid,text,uuid)','EXECUTE') AND to_regprocedure('public.member_classifieds(text,jsonb)') IS NOT NULL AND (SELECT count(*)>0 FROM public.member_listing_period_transfers);")
            assert invariant.returncode==0 and " t" in invariant.stdout,invariant.stderr
            print("PASS rollback restores prior RPCs while retaining private transfer/payment history")

        if "--google" in sys.argv:
            for path in ["tests/member-google-fixture.sql","supabase/migrations/20261105160000_google_member_email_proof.sql","tests/member-google.sql"]:
                result=sql((repo/path).read_text())
                if result.returncode: raise RuntimeError(f"{path}: {result.stderr[-3000:]}")
                print(f"PASS {path}")

    finally:
        subprocess.run([str(pg / "pg_ctl"), "-D", str(data), "-m", "fast", "-w", "stop"], check=True, env=env, stdout=subprocess.DEVNULL)
