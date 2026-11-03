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
        if "--referrals" in sys.argv or "--community" in sys.argv:
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
            if "--community" in sys.argv:
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

    finally:
        subprocess.run([str(pg / "pg_ctl"), "-D", str(data), "-m", "fast", "-w", "stop"], check=True, env=env, stdout=subprocess.DEVNULL)
