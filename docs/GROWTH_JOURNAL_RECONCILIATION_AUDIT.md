# Growth journal reconciliation audit — 14 November 2026, 04:23 UTC

## Scope
Read-only productive catalog audit against byte-exact local `drizzle/migrations/0013_admin_public_traffic.sql` and `0014_growth_hourly_traffic.sql`. No journal, schema, data, flags, cron, deployment or publication changes. Instagram release remains blocked; do not bypass its official migration failure.

## Verified evidence
- Drizzle newest applied row: id 13, `created_at=1794417868085`, hash `ce10c28c86724b146e86587d6fc99584c73caf1bf020016326c5725c5804792c` (0012). Official inspection reports missing database rows for 0013 (`1794603600000`) and 0014 (`1794606000000`).
- All three function `prosrc` bodies match the respective local body byte-for-byte after trim. SQL functions are stable/security invoker; trigger function is PL/pgSQL/volatile/security invoker. All use empty search_path; execute ACL is exactly postgres/service_role, with no PUBLIC/anon/authenticated execute.

| Function | SHA-256 of trimmed body |
|---|---|
| admin_public_traffic | b4b00db66d97bfe820476da43296ad4dbcbe8cccde821432fcf558b2be437505 |
| record_public_traffic_hour | 5996cf660dee9b9734dc37b0c352e78abf22b6f1cea979a764e38b9be7d6d1fd |
| admin_public_traffic_hours | f7e55b0b939d8480abc646f6c7290472252594476114e1a4b8dec223d2bd6b3c |

### Hourly table and trigger
- Columns match: `hour_start timestamp without time zone NOT NULL`, `views bigint NOT NULL`.
- Validated PK `site_analytics_hourly_pkey`: `PRIMARY KEY (hour_start)`.
- Validated CHECK `site_analytics_hourly_views_check`: `views > 0`.
- RLS enabled, FORCE RLS false, zero policies: matches the local RLS setup, no anonymous/authenticated grant.
- **ACL difference:** production table ACL is `{postgres=arwdDxtm/postgres,service_role=arwdDxtm/postgres,sandbox_exec=ar/postgres}`. Local 0014 grants service_role only SELECT/INSERT/UPDATE/DELETE; production additionally grants service_role TRUNCATE/REFERENCES/TRIGGER/MAINTAIN, plus sandbox_exec SELECT/INSERT. Therefore table ACL is not byte-exact to the explicit local grant block. No grants were changed; provenance of additional privileges is unverified.
- Trigger `record_public_traffic_hour` enabled `O`, on `public.site_analytics_daily`, AFTER INSERT OR UPDATE OF event_count, FOR EACH ROW, calls the correct function. Predicate matches 0014: page_view, exclusion of admin/painel-bikes/conta/newsletter-confirmar prefixes and current São Paulo calendar day. PostgreSQL deparser adds casts/omits public qualification; semantics match.

## Official mechanism result
Called `lov_database.migration_history({"operation":"inspect"})`.
Result: `"No unique historical migration tree matching all applied database rows is available."`
Findings: missing snapshots for 0006–0010, 0013 and 0014; missing database rows for 0013/0014. **No plan_id or actionable repair plan was returned.**

The only offered mutation signature is `lov_database.migration_history({"operation":"repair","plan_id":"<exact plan_id returned by inspect>"})`. There is no schema-recognition/adopt-existing-objects option, tag selector, SQL/hash parameter or valid plan_id from this inspection; it cannot officially reconcile only these two already-present versions in the current state. Do not invent a plan ID or call repair without one.

## Release consequence
No further restoration migration attempt, CAS conversion, hold write, Meta request, deployment, activation or Hub Publish was performed. Existing 0013/0014 SQL and journal/snapshots stay untouched. A supported official exact-version adoption/reconciliation operation is required before the planned Instagram restoration release can continue; catalog equivalence alone does not establish applied journal history, particularly with the observed ACL difference.

## Conditional-adoption request — 14 November 2026, 04:27 UTC
Repeated official inspection confirms 0013/0014 still lack applied database rows and no repair plan is available. Platform migration rules prohibit rewriting existing `drizzle/migrations` SQL into a conditional adoption implementation. The only pending-blocker edit exception permits commenting out every statement while preserving its text and journal entry; that is not equivalent to the owner's requested validated adoption and was not used. Draft history repair is a different exception and does not apply to this main-project release.

Stopped before editing either protected pending file. No conditional SQL or disposable adoption tests were created: such tests would not make a forbidden production migration-file rewrite safe or supported. No original hash/journal/snapshot/grant changed. New Admin Instagram remains intact at `2c8f60f9dd04a7d00d7cad345584d6c438a234d7`. Codex needs a platform-supported exact-object adoption mechanism or an explicit supported pending-file rewrite capability before implementing this proposal; unsupported manual journal repair remains excluded.