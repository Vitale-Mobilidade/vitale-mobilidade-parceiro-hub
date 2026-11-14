# Instagram v3 — preparation only

Resumed from partial HEAD 6207ec7; preserved unrelated work, v1/v2 renderer paths, saved assets, article behavior and podcast. Versioned product skill v3 is actually injected for new scripts. Contract supports meaningful grounded callouts and a topic closing question, while saved versions remain unchanged.

## Integration and checkpoints
The private Deno action resolves validated YouTube thumbnail and official bike asset from the leased job, using the article's shared reference/payload helpers and exact COVER_MODEL `google/gemini-3.1-flash-image`. The article's default payload has exact parity coverage and was not changed. Instagram-only payload requests 4:5, no lettering, **environment without any bike**; foreground composition retains the complete official catalog photograph. Thumbnail and catalog bytes are bounded/decoded and MIME detected from signatures. Internal auth, settings, lease and scene_attempted/state gates precede any paid call; uncertain requests are never replayed. Snapshot/Hub never import codecs. Renderer uses cached fonts, Uint32 fills and no per-pixel object allocation. Generic graphics now receive grounded annotations rather than V9-specific phrases.

Original article association alone remains insufficient for product identity. The offline preview uses a visually checked bike-free environment crop from the existing original plus the official complete bike. No new Gemini request was made; live generation availability, provider acceptance and fidelity of a future output remain **unverified**. The explicitly requested existing image model is retained; platform catalog feedback marks it deprecated. Do not silently substitute a model; a future release must confirm its availability before paid use.

## Validation
- Vitest: 49/49 directed tests, including exact article payload parity, exact Instagram model, thumb/catalog order, zero text/bike environment direction, strict thumbnail provenance, v3 evidence/callout validation, useful short-body acceptance, v1/v2 preservation, workflow and admin boundaries.
- Deno: 8/8 tests. Mock end-to-end leased v3 cover → six actual JPEGs → review; resumes/re-render checkpoint uses only one mocked image request, never a real AI request. Codec detection caught catalog PNG disguised as `.jpg` and verified correct payload MIME. Missing auth/stale leases/generation disabled remain blocked. Warm per-slide sandbox CPU guard <1000ms passed; final preview measured approximately 100–205ms per slide, not a deployed-runtime benchmark.
- Six JPEGs decoded/verified as 1080×1350; individual feed screenshots and contact sheet inspected. Mobile gallery same-component isolated mounting loaded all local images, navigated six positions and switched v2, no console errors or page overflow. Full local route did not render; hosted authenticated gallery is not claimed validated.
- `pnpm validate` attempted exactly as requested; pnpm triggered implicit installation and stopped on `ERR_PNPM_IGNORED_BUILDS` for esbuild before executing validation. Restored existing packages with `bun install --frozen-lockfile`; removed only newly generated pnpm metadata. Automatic platform builds report **build OK**. No manual broad build/typecheck was substituted and pnpm validate is not claimed passed.

## Eight-perspective review
| Perspective | Result |
|---|---|
| Product | Question → lighting → load meaning → observed climb → signaling checks → conversation; each slide has a role. |
| CTO | Shared article builder, version dispatch and lease/checkpoints; no Worker codecs or new schema. |
| AI | Transcript factual, article visual context; source data untrusted; exact requested model and mock-only parity, no invented measured slope/lux. |
| Security | Service key server-only; internal action/lease/settings gates retained, paths resolved internally, private review binaries DEV-only. |
| UX | Condensed licensed headlines, regular explanatory text about 42–44px (15.2–15.9px at 390), alternating palettes, annotations not decorative icons. |
| CX | Whole catalog bike once; alt describes actual composite/graphics; offline v3 distinct from real review v1. |
| Growth | Narrative provides reasons to continue; four final actions, no article/bio CTA; no conversion promises. |
| PMO | Private JPEGs and reproducible input delivered; tests and blockers explicit; no production release or spend. |

## Cost, release and rollback
Real Gemini/Meta calls: **0**; image-generation credits: **0**. Agent-workspace usage is not measurable here. No deployment, publish, migration, settings update, job write/upload, cron or podcast operation occurred; original asset lookup/download was read-only.

Next: owner reviews the private files; resolves pnpm tooling and full local/hosted route verification; authorizes a narrow Hub/Edge release separately; then explicitly creates/reviews one job through authenticated Admin. No automatic activation or publication. New scripts use v3 only after that release; saved v1/v2 are not upgraded.

Rollback: reapply the previous shared builder/Instagram files from 6207ec7 without resetting unrelated commits; saved v1/v2 assets remain valid. No database rollback needed. Keep original v1/v2 assets and the private review JPEGs. Do not replay uncertain scene/publish requests as rollback.