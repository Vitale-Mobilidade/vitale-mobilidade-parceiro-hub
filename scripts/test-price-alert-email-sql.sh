#!/usr/bin/env bash
set -euo pipefail
unset PGHOSTADDR PGSERVICE PGSERVICEFILE PGOPTIONS
task_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
task_pg_bin="${PG_BINDIR:-$(pg_config --bindir)}"
task_tmp="$(mktemp -d /tmp/vitale-email-sql.XXXXXX)"
cleanup() { "$task_pg_bin/pg_ctl" -D "$task_tmp/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf -- "$task_tmp"; }
trap cleanup EXIT
mkdir "$task_tmp/socket"
"$task_pg_bin/initdb" -D "$task_tmp/data" -U email_fixture_owner -A trust --no-locale -E UTF8 >"$task_tmp/init.log"
"$task_pg_bin/pg_ctl" -D "$task_tmp/data" -l "$task_tmp/postgres.log" -o "-F -k $task_tmp/socket -h '' -p 55424" -w start >/dev/null
task_psql=("$task_pg_bin/psql" -X -h "$task_tmp/socket" -p 55424 -U email_fixture_owner -d postgres -v ON_ERROR_STOP=1)
"${task_psql[@]}" -f "$task_root/scripts/fixtures/price-alert-email-setup.sql" >/dev/null
"${task_psql[@]}" -f "$task_root/docs/sql/price-alert-release/20261118180000_price_alert_email.sql" >/dev/null
"${task_psql[@]}" -f "$task_root/docs/sql/price-alert-email-2026-11-24/forward.sql" >/dev/null
"${task_psql[@]}" -f "$task_root/scripts/fixtures/price-alert-email-assert.sql"
"${task_psql[@]}" -f "$task_root/docs/sql/price-alert-email-2026-11-24/rollback.sql" >/dev/null
"${task_psql[@]}" -c "DO \$\$ BEGIN IF (SELECT enabled FROM price_alert_email_settings) THEN RAISE EXCEPTION 'rollback did not pause'; END IF; END \$\$;" >/dev/null
