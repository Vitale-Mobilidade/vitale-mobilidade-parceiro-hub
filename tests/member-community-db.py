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
CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz, is_anonymous boolean DEFAULT false);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
CREATE TABLE public.editorial_admin_memberships(user_id uuid PRIMARY KEY, active boolean, role text);
REVOKE ALL ON public.editorial_admin_memberships FROM PUBLIC,anon,authenticated;
CREATE TABLE public.editorial_articles(id uuid PRIMARY KEY, status text, title text, slug text);
INSERT INTO auth.users VALUES
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
    finally:
        subprocess.run([str(pg / "pg_ctl"), "-D", str(data), "-m", "fast", "-w", "stop"], check=True, env=env, stdout=subprocess.DEVNULL)
