"""Disposable PostgreSQL, no TCP/network or existing databases. PG_BIN can select local binaries."""
import getpass
import os
from pathlib import Path
import subprocess
import tempfile

repo = Path(__file__).resolve().parents[1]
pg = Path(os.environ.get("PG_BIN", "/opt/homebrew/opt/postgresql@17/bin"))
env = {k: v for k, v in os.environ.items() if not k.startswith("PG")}
with tempfile.TemporaryDirectory(prefix="vitale-favorites-test-") as directory:
    root = Path(directory)
    data = root / "data"
    subprocess.run([str(pg / "initdb"), "-D", str(data), "-A", "trust", "--no-locale", "--encoding=UTF8"], check=True, env=env, stdout=subprocess.DEVNULL)
    with (data / "postgresql.conf").open("a") as config:
        config.write(f"\nlisten_addresses = ''\nunix_socket_directories = '{root}'\nport = 55439\n")
    subprocess.run([str(pg / "pg_ctl"), "-D", str(data), "-l", str(root / "postgres.log"), "-w", "start"], check=True, env=env, stdout=subprocess.DEVNULL)
    command = [str(pg / "psql"), "-X", "-q", "-h", str(root), "-p", "55439", "-U", getpass.getuser(), "-d", "postgres", "-v", "ON_ERROR_STOP=1"]
    try:
        fixture = """
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY, is_anonymous boolean DEFAULT false, deleted_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE public.bikes(bike_id text PRIMARY KEY);
INSERT INTO public.bikes VALUES('v9_max'),('v8_pro');
CREATE TABLE public.member_community_settings(singleton boolean PRIMARY KEY, enabled boolean);
INSERT INTO public.member_community_settings VALUES(true,true);
INSERT INTO auth.users VALUES
('00000000-0000-4000-8000-000000000001',false,null),
('00000000-0000-4000-8000-000000000002',false,null),
('00000000-0000-4000-8000-000000000003',true,null),
('00000000-0000-4000-8000-000000000004',false,now());
"""
        for label, content in [
            ("bootstrap", fixture),
            ("migration", (repo / "supabase/migrations/20261106230000_radar_favorites.sql").read_text()),
            ("private persistence, idempotency, ownership, grants, RLS and flag", (repo / "tests/radar-favorites.sql").read_text()),
        ]:
            result = subprocess.run(command, input=content, text=True, capture_output=True, env=env)
            if result.returncode:
                raise RuntimeError(f"{label}: {result.stderr[-3000:]}")
            print(f"PASS {label}")
    finally:
        subprocess.run([str(pg / "pg_ctl"), "-D", str(data), "-m", "immediate", "-w", "stop"], check=True, env=env, stdout=subprocess.DEVNULL)
