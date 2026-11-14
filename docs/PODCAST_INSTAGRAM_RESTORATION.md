# Shared podcast Instagram restoration — staged only

## Scope and provenance
Owner correction replaces the independent-post proposal. Compared `5ac2d34^` with HEAD. Restored historical `podcast-worker`, `AdminPodcasts` and the admin/worker actions selectively; retained current preparation improvements (attached audio, RSS `prepared_cover_path`), Growth and all other changes.

Removed only previous-round `8e3ee77` independent post modules, new workspace, routes, dispatcher, SQL and their integration hooks. No branch reset; no production changes. Historical carousel rows/IDs remain intact and their admin mutations now return authenticated 410; images and caption stay readable.

## Integration / AI / media / schedule
- Integration: existing podcast queue/delivery table, admin membership, worker signature, Meta Unified Login client and one `/media` + `media_publish`. No carousel containers.
- AI: no new pipeline/call. Existing summary-to-caption fallback and already prepared caption are preserved byte-for-byte when available; richer editorial captions are deferred, not required for restoration.
- Media: RSS 1400×1400 and article horizontal untouched. IG uses the same verified `capture.coverBackground` Storage original, legacy Inter/brand renderer, complete photo without crop/stretch, 1080×1350 JPEG, 120px side inset. Missing original returns 422 `podcast_instagram_original_missing`; source-version mismatch fails closed. Separate `article-id/podcast-instagram/v4-version.jpg` path; no square overwrite/regeneration.
- Schedule: existing `podcast_release_slot`, `vitale-podcast-release` and `vitale-podcast-instagram-schedule`, 06:15 / 11:45 / 17:45 São Paulo unchanged. Existing manual scheduling routine restored, not a new agenda. No retroactive insert/backfill. Published deliveries never claimed. Keep existing OR readiness view so already-prepared RSS episodes stay ready without social failure blocking RSS.

## Pending legacy media and uncertainty
Pending, never-published delivery with no container adapts image under the existing delivery lease, validates exact article revision, caches 4:5 and CAS-updates only `prepared_instagram_post`, retaining caption. No delivery insert from adaptation. Existing legacy containers are blocked (`podcast_instagram_legacy_container_reconcile`) rather than published as square or silently recreated. Inspect Meta/history separately before deciding their disposition.

Before create, persist `meta_create_uncertain`; after confirmed container/save clear it. Transport/response/save uncertainty leaves marker and cannot replay. `publish_attempted_at` is persisted before publish and always excludes retry; loss after publish needs manual reconciliation, never flag reset. Permalink failure does not undo confirmed publication. Scheduled expiry checked before publish; no early send or catch-up beyond existing 15-minute limit.

## Reviewed SQL, not applied
`docs/sql/instagram-release/20261114060000_restore_podcast_instagram.sql` contains only five `CREATE OR REPLACE FUNCTION` definitions and the current readiness view, plus exact existing execute restrictions. Original definitions derive from the applied delivery/schedule migrations before `5ac2d34`; added uncertainty predicates protect Meta. No table/index/cron/credentials/flags DDL, no discovery, no journal edits, no retroactive update/insert. Trigger and `dispatch_podcast_tick` remain existing — confirm their definitions before activation.

## Minimal production steps — separate authorization required
1. Read-only audit and recoverable backup: exact `pg_get_functiondef` of the five functions, view definition/ACL, trigger, dispatch tick and both cron jobs; existing flags; delivery counts/IDs/status/container/publish-attempt (no secrets). Confirm six legacy published remain six and carousel paused. Preserve any third-party definition change rather than overwriting unseen changes.
2. Review/apply only the pending SQL through the official migration workflow, compare definitions/permissions. It is tested twice in disposable PostgreSQL, but has not run on production.
3. Isolated release of `bike-image` and `editorial-admin`, and reviewed Hub changes; no flag/cron change included here. Check caller auth/worker signature fail closed and layout4 source-version validation.
4. With social disabled or claims gated during acceptance, inspect a pending no-container episode's 4:5 preview; retain all legacy media/history and explicitly reconcile old containers. Adaptation writes in production require separate permission; this build used only fixture/local original and mock storage.
5. Owner authorizes resumption of existing flow. Confirm existing flags, no duplicate cron, no backfill, pending-only claims, and next existing future window. No real Meta call is needed for mock acceptance; production end-to-end remains unverified here.

## Rollback
First pause only existing Instagram flag with authorization (RSS stays intact); restore backed-up function/view definitions and previous Edge/Hub artifacts. Preserve v4 media, all delivery/container IDs and attempt markers. Never delete history or clear uncertain markers to make replay possible. Do not reinstall carousel dispatch or add another cron.

## Eight-function review
- Product: original shared flow restored, no new workspace/agenda; legacy caption fallback unblocks restart.
- CTO: reuse historical worker/client/admin; additive versioned media, current RSS readiness retained.
- AI: zero paid calls/new prompts, no fabricated claims or regenerated imagery.
- Security: admin and HMAC authorization unchanged; SQL execute ACL retained; no secrets in errors.
- UX: complete image/title/product and safe sides; private source, existing Admin preview, historical read-only.
- CX: clear missing-original/version errors and reconciliation, no circular unsafe retry.
- Growth: same known windows, no old-post republication, no impact to affiliate/article links.
- PMO: staged only, removal list, narrow rollback, production acceptance explicitly pending.

## Validation and preview
Local Mobylette original reused from previous-round sandbox; no download/generation or production fetch. Rendered JPEG 1080×1350, inspected at 390px and in existing Admin with mocked session/API/storage, desktop/mobile no overflow or browser errors. This is not a production authenticated test and does not establish active cron/flags.
Focused Vitest and disposable PostgreSQL tests cover separate RSS/IG paths, whole-photo/title, side inset, exact existing windows, unchanged caption, source/save failure, one-image Meta mock, uncertain no-replay, dedupe, future schedules and concurrent claims. Deno checks cover both release entrypoints. Automatic harness build/typecheck checked separately. No paid IA/Meta, deploy, real post, production SQL or flag change. Monetary platform/tool usage is not exposed; paid model calls: zero.