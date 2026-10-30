#!/usr/bin/env bash
set -euo pipefail
unset PGHOSTADDR PGSERVICE PGSERVICEFILE PGOPTIONS

# Disposable local cluster, private Unix socket, no TCP, no production config.
task_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
task_pg_bin="${PG_BINDIR:-$(pg_config --bindir)}"
task_tmp="$(mktemp -d /tmp/vitale-radar-relevance.XXXXXX)"
task_port=55439
cleanup() {
  "$task_pg_bin/pg_ctl" -D "$task_tmp/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf -- "$task_tmp"
}
trap cleanup EXIT
mkdir "$task_tmp/socket"
"$task_pg_bin/initdb" -D "$task_tmp/data" -U radar_fixture_owner -A trust --no-locale -E UTF8 >"$task_tmp/init.log"
"$task_pg_bin/pg_ctl" -D "$task_tmp/data" -l "$task_tmp/postgres.log" -o "-F -k $task_tmp/socket -h '' -p $task_port" -w start >/dev/null
task_psql=("$task_pg_bin/psql" -X -h "$task_tmp/socket" -p "$task_port" -U radar_fixture_owner -d postgres -v ON_ERROR_STOP=1)
"${task_psql[@]}" -f "$task_root/scripts/fixtures/radar-relevance-setup.sql" >/dev/null
"${task_psql[@]}" -f "$task_root/supabase/migrations/20261030170000_radar_offer_click_relevance.sql" >/dev/null
"${task_psql[@]}" -f "$task_root/scripts/fixtures/radar-relevance-assert.sql"
