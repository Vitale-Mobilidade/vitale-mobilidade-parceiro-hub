import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const { PGlite } = await import(process.argv[2]);
const db = new PGlite();
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create table public.bikes (bike_id text primary key, name text);");
await db.exec(read("drizzle/migrations/0005_admin_analytics_v2.sql").split("-- Exact, PII-free")[0]);
await db.exec(`create table public.site_analytics_hourly (hour_start timestamp primary key, views bigint not null check (views > 0));
  alter table public.site_analytics_hourly enable row level security;
  revoke all on public.site_analytics_hourly from public, anon, authenticated;
  grant all on public.site_analytics_hourly to service_role;`);
await db.exec(read("docs/sql/links-campaign-release/rollback.sql"));
for (const signature of ["admin_public_traffic(date,date)", "admin_site_analytics_range(date,date)", "record_public_traffic_hour()"])
  await db.exec(`revoke all on function public.${signature} from public,anon,authenticated; grant execute on function public.${signature} to service_role;`);
await db.exec(`create trigger record_public_traffic_hour after insert or update of event_count on public.site_analytics_daily for each row
  when (new.event_name='page_view' and new.source_path !~* '^/(admin|painel-bikes|conta|newsletter/confirmar)(/|$)' and new.day=(now() at time zone 'America/Sao_Paulo')::date)
  execute function public.record_public_traffic_hour();`);
const day = "(now() at time zone 'America/Sao_Paulo')::date";
await db.exec(`insert into public.site_analytics_daily(day,event_name,source_path,event_count) values
  (${day},'page_view','/',10), (${day},'page_view','/entrenogrupodeofertas',4),
  (${day}-1,'page_view','/',7), (${day}-1,'page_view','/links',9);`);
const scalar = async (sql) => (await db.query(sql)).rows[0].value;
const hours = () => scalar("select sum(views)::int as value from public.site_analytics_hourly");
const totalBefore = await hours();
const defs = await db.query("select proname,pg_get_functiondef(oid) as def,proacl::text as acl from pg_proc where pronamespace='public'::regnamespace and proname in ('admin_public_traffic','admin_site_analytics_range','record_public_traffic_hour') order by proname");
await db.exec(read("docs/sql/links-campaign-release/forward.sql"));
await db.exec(`insert into public.site_analytics_daily(day,event_name,source_path,event_count) values (${day},'page_view','/links',5), (${day},'page_view','/links///',2);
  select public.record_site_analytics('page_view','/links','','','');`);
assert.equal(await hours(), totalBefore, "Bio insert and update must not increment hourly Growth");
const traffic = await scalar(`select public.admin_public_traffic(${day},${day}) as value`);
assert.equal(traffic.days[0].views, 10);
assert.equal(traffic.days[0].previousViews, 7, "Previous period must also exclude bio");
const site = await scalar(`select public.admin_site_analytics_range(${day},${day}+1) as value`);
assert.equal(site.pageViews, 14, "Preserve existing sitewide policy for other campaigns");
assert.ok(site.pages.every((row) => !row.path.startsWith("/links")));
assert.equal(await scalar(`select event_count::int as value from public.site_analytics_daily where day=${day} and source_path='/links'`), 6, "Bio remains available for Campanhas");
await db.exec("select public.record_site_analytics('page_view','/','','','');");
assert.equal(await hours(), totalBefore + 1, "Normal traffic must still increment");
for (const signature of ["admin_public_traffic(date,date)", "admin_site_analytics_range(date,date)", "record_public_traffic_hour()"])
  assert.equal(await scalar(`select has_function_privilege('anon','public.${signature}','execute') as value`), false);
assert.equal(await scalar("select has_table_privilege('anon','public.site_analytics_daily','select') as value"), false);
const rowsBeforeRollback = await scalar("select sum(event_count)::int as value from public.site_analytics_daily");
await db.exec(read("docs/sql/links-campaign-release/rollback.sql"));
assert.equal(await scalar("select sum(event_count)::int as value from public.site_analytics_daily"), rowsBeforeRollback);
assert.deepEqual((await db.query("select proname,pg_get_functiondef(oid) as def,proacl::text as acl from pg_proc where pronamespace='public'::regnamespace and proname in ('admin_public_traffic','admin_site_analytics_range','record_public_traffic_hour') order by proname")).rows, defs.rows);
await db.close();
console.log("Pass: bio counted for Campanhas, excluded from daily/previous/sitewide/hourly Growth; normal visits and ACLs preserved; function rollback exact and no data loss.");
