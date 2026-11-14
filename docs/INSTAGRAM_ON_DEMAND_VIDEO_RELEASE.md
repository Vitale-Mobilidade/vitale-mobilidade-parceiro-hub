# Instagram: selected-video generation — review-only release

## Scope and behavior
- `/admin/videos`: administrator selects a video, then explicitly clicks **Gerar carrossel**. Navigation/mount only reads eligibility. Older eligible videos are supported.
- Existing `instagram_carousel_sources` view filters active videos, nonblank transcripts, valid dates and published linked articles. Selected-video lookup orders by publication timestamp descending and article ID descending for deterministic ties; supplied article must match that selected pair.
- Authenticated bounded batches (40 IDs per request) project only video/article/job IDs, revision and state. No transcript, article body or internal headers in this response. Library IDs are chunked; existing UI and podcast remain intact.
- Existing unique video/article upsert and atomic revision lease remain authoritative. Existing pairs open their exact draft, including blocked/published rows; Resume remains a separate explicit action. Generation/resume rechecks current eligibility and releases lease on validation failure. Uncertain paid attempts keep their no-replay checkpoints.
- `/admin/instagram?id=<uuid>` validates selection and reads the exact authorized draft even beyond the latest 40 jobs. Missing selected ID never silently displays a different job.
- Approval, publication and scheduling are not invoked by this action. Manual review/publication controls remain unchanged.

## Art
Final footer-only JPEG: Files `vitale-v9-noite-r4/slide-06-assinatura-ajustada.jpg`, 1080×1350. Capsule enlarged and recentered; 28px net text breathing room plus border. Official circular disk, petroleum fill, mint outline, Inter weight and icon/@ spacing preserved. Inspected enlarged and at 390px. Pixels outside footer remain unchanged before JPEG re-encoding. Slides 01–05 untouched. Generic v4 footer derives capsule width from font metrics and uses the same 28px room; saved previous assets/v1–v3 unchanged. Files is not an imported private Admin revision.

## Read-only integrated database check
14 November 2026: `generation_enabled=true`, no pause, `publishing_enabled=false`, `automation_enabled=false`. Scheduling column absent, interpreted off. This does not independently verify deployed release secret/runtime or make the new click live. No flags/data changed.

## Verification
- 114 Vitest tests passed: selected older source, excluded source cases, deterministic article ordering/projection, malformed IDs, max-40 batch, unauthorized admin, release/generation/pause gates, existing blocked/published drafts, concurrent insert winner/reopen, latest-source preparation, checkpoints and scheduling/regression suites.
- 2 Deno v4 tests passed, covering six masters and preserved v1–v3 dispatch. Harness typecheck/build OK.
- Local browser fixture: select older video → click once → streamed mock generation → open exact UUID draft; only one generation request, none on mount. Desktop and 390px inspected. Existing-pair reopen also exercised.
- Browser data/session were intercepted only inside the local test; no repository auth weakening. Fixture shell interception causes an expected hydration mismatch, so this is not proof of real-session SSR. Real hosted authenticated flow remains unverified: managed requesting-user session mint failed because no matching account was available. No real AI or Meta calls.
- Full `pnpm validate` is not manually invoked: the environment prohibits manual project builds/typechecks. Its three regression files were run (69 tests); harness owns build/typecheck.

## Isolated release after diff approval
1. Review this source delta from `22482d1`; preserve unrelated HEAD changes. **No scheduling SQL/migration is needed for this click.** Do not apply pending scheduler migration or install callback/cron.
2. Publish the reviewed Hub code only after approval. Selected-video lookup/streaming are Hub server changes; no Edge function changes are required for the click itself.
3. If deploying the new generic footer, separately deploy only `editorial-admin` with its reviewed signature helper delta, preserving authentication. Do not release unrelated functions or enable scheduling. Existing draft JPEGs remain immutable; the Files art needs a separately authorized private revision import if desired.
4. On the **published** `https://vitalemobilidade.com/admin/videos`, authenticate as authorized owner; verify read-only batch/gates and older-video action first. Only an explicit generation click may spend model credits. Verify progress and exact saved revision/art readback. Preview success is not production activation proof.
5. Manual publishing remains blocked while `publishing_enabled=false`. A separate owner-authorized enablement, exact-art approval and explicit publish command are prerequisites to posting; no scheduler activation or Meta request is needed to make generation available.

## Rollback and governance
Revert only this source delta after stopping new clicks; preserve jobs/assets/checkpoints and prior published rows, never replay uncertain attempts. No database rollback or scheduler migration is necessary. Revert only the footer helper if its narrow Edge release occurred; saved art is unaffected.

Product/UX/CX: explicit action, eligibility explanation, progress, exact draft and optional download only. CTO: existing view/pipeline, bounded DTOs, deterministic source and unique pair. AI: no calls for validation; existing attempt checkpoints preserved. Security: endpoint admin check before private reads, ID/body limits, no secrets exposed. Growth: no navigation-triggered paid work or blocked affiliate changes. PMO: generation and footer releases separated; no claims of production activation; scheduling stays off.

Cost: zero model/Meta calls, no content generation, no deploy or production writes in this change. Monetary platform cost not measured.