# Instagram Editorial System 1.0 — preparation, not release

## Exact state
- Based on `ed3f3eb`; new artVersion 4, fixed six masters A–F, Inter static Latin subsets (OFL) and Lucide paths (ISC). Versions 1–3 and their review assets dispatch unchanged. Article builder/model and podcast untouched.
- Six individual real JPEGs rendered with the existing Edge compositor, 1080×1350, private sandbox `/tmp/instagram-system/review`; **not committed, not uploaded, not production drafts**. Existing V9 catalog photo and title-free environment reused; B uses a lettering/panel-free traffic strip from the existing validated thumbnail. Published article cover inspected separately but never used as factual evidence or as an identity-proven original.
- The full published article (12 blocks) and transcript (9,631 characters) were read only into a temporary source fixture. Review copy is deterministic, not Gemini output. The fixture preserves literal source quotes; evidence kinds distinguish observation/opinion/context/declaration/measurement/estimate and article-origin context/declaration. It does not claim measured lighting or tested maximum load.
- No real Gemini or Meta calls, no deploy, migration, live settings/flags, draft mutation, new production job or podcast change. Generation cost: zero. Account monetary balance was not queried.

## Preview and honesty
In a development sandbox with an existing authorized admin session, open `/admin/instagram` and select **Revisão do sistema editorial**. The server serves manifest and individual JPEGs only after the same existing admin membership check; no public CDN URLs, token in URL, required download or auth bypass. Position is validated and hashes checked. Published builds return 404 for this sandbox endpoint. No `artPreview` bypass remains.

This turn could not mint the requesting user's session: the account lookup returned no matching app user. The complete authenticated navigation is therefore **not verified**; signed-out Admin login and anonymous JSON 401 were verified. Hosted preview compiles as production and cannot access `/tmp` files without an authorized deployment/isolated review environment; **do not promise the sandbox tab works on the hosted hostname**. Chat screenshots provide the visual evidence instead. Sandbox files may be lost on restart and are reproducible with `scripts/instagram-editorial-preview.ts` using the verified source assets; no user download is needed.

All six images loaded at 390px with natural size 1080×1350. Main support 42px gives ~15.2px at 390px. No auto-shrink. Per-slide observed sandbox composition 83–297ms including initial font parsing; Deno guard <1s, not a guarantee for production CPU. Product wheels/geometry remain whole. Final only: verdict/question, four Lucide actions and signature.

**Visual limitation:** B has a verified traffic strip rather than a rich full frame. C–E use supported typography/cards/Lucide, not invented component photographs. They are less photographic than the supplied references, and the narrative still leans on explaining evidence limits rather than enough distinct test discoveries. This is a reviewable implementation, **not owner-approved final art**. No comparative carousel was fabricated: a second corresponding verified source/asset set was not loaded in this scope. Dense 3-card C uses the document's 29px card size and must be checked per actual future script; fail-closed fit remains mandatory.

## Validation
- Targeted Instagram Vitest suite: 62/62 (auth, sources, compatibility, no replay, exact model/thumb/catalog/article-cover mock payload, revision approval/publication ordering).
- Deno v4/v3 render tests: 2/2; `deno check` of private Edge handler passed.
- `pnpm --config.verify-deps-before-run=false validate` succeeded with installed dependencies (69 core regression tests, typecheck, build); automatic build signal OK.
- No real gateway call or hosted Edge invocation; model payload and Meta path mocked only. Snapshot still avoids eager compositor/Meta imports.

## Eight perspectives
| Perspective | Review |
|---|---|
| Product | One finding/slide, five-to-seven pages and self-contained final verdict. Final art approval pending. |
| CTO | Version 4 dispatch, cached Inter, Uint32 fills; no Worker codec imports. Authenticated sandbox independent of production jobs. |
| AI | Full blocks and transcript, classification and literal evidence; shared exact cover model and separate thumbnail/catalog/published-cover inputs. No paid call. |
| Security | Existing admin auth; private/no-store/Vary headers; internal cover host/id paths validated; lease/checkpoints unchanged. Sandbox no writes or publish actions. |
| UX | Single-image 390px review, previous/next and index; main support legible, no downloads required. Hosted access blocker explicit. |
| CX | Versions/revisions clearly distinguished; missing imagery and failed fit surfaced, no fabricated close-ups. |
| Growth | Autonomous narrative and contextual question, no external CTA; no engagement/performance promises. |
| PMO | Preparation only; no release/flags. Owner acceptance and isolated hosted review are next gates. |

## Activation and rollback
Owner must first review final art and authorize Hub + narrow `editorial-admin` deployment. An isolated authenticated review store/environment is needed for hosted sandbox review without production draft writes. Existing private bucket/settings/role checks, generation release gate, configured image/script key and publishing credentials need read-only confirmation at activation. No additional migration is proposed. Generation remains explicit; exact revision and JPEG hashes are checked on approval. Publishing stays a separate explicit command under `publishing_enabled`, with scoped temporary media tokens, ordered children/album, checkpoint before `media_publish`, and reconciliation rather than replay on uncertainty. No automated cron or Meta activation in this round.

Rollback is code-only: restore prior new-script direction and remove v4 dispatch/sandbox tab; saved v1–v3 and assets untouched. Never revert database/settings or resend jobs as part of rollback. No secrets rotate or release actions here.