# Instagram art direction v2 — sandbox review

## Scope and usable preview
Started from `417d9fb` in the active project. No podcast code, production draft, settings, SQL, cron, Gemini, Meta, Edge deployment or Hub publication changed.

Open the Lovable development preview at `/admin/instagram?artPreview=2`. This development-only gallery displays six immutable project JPEG assets and never calls Instagram endpoints; normal admin authentication and job flow are unchanged. Use the slide buttons for 390px feed inspection. This fixture gallery is not a production draft and is disabled in production.

Sources: AHHPeeQE11k transcript excerpts read on 13 November 2026, linked article `2b052856-77e1-46fe-b9b6-97d2fe7603f1`, verified catalog photo `v9_max/d45e5b5c37.png` (1074×992). The linked article's original background was located internally, but its stored metadata does not prove bike identity. It was not used; the real catalog photograph is contained without cropping, with connected-white-background removal and deterministic night-color treatment. This is a graphic treatment, not a fabricated night photograph.

## Visual review
- Cover: large whole bike and wheels, one short headline, no white band or duplicate text. Licensed Big Shoulders Bold display and Instrument Sans Regular support, OFL bundled. A slight white antialias halo remains on the catalog cutout; no bike pixels are AI-invented.
- Lighting: illustrative beam expresses lighting without pretending to be photometry; explicitly labeled.
- Load: 150 kg is labeled total load capacity, not passenger/rider weight or climbing capacity.
- Route: ascent line communicates the observed test, no slope degrees, scale or load claim.
- Decision: trade-off headline plus signaling remarks; graphic is not an invented component close-up.
- Ending: four recognizable icons and Curta / Compartilhe / Comente / Salve, no external CTA.

Desktop side-by-side, individual cover/beam at 390px feed size and 390×844 mobile checked with Playwright: six loaded 1080×1350 images, no page errors or horizontal overflow. Supporting text is intentionally secondary; evidence/caption retain context. Other modules remain deterministic and supported, but battery/comparison do not appear in this fixture because the chosen source does not need them.

## Eight-perspective review
| Perspective | Decision / residual risk |
| --- | --- |
| Product | Each module answers one editorial question; 4–7 slides including fixed ending. No production draft mutation. |
| CTO | v2 dispatched explicitly; v1 byte-stability regression and completed-review no-op tested. Fonts cached, Uint32 fills preserved. |
| AI | Compact versioned skill is injected into the actual generator prompt; literal evidence retained. No paid generation used. |
| Security | Edge service-key/lease path unchanged; internal-path plus explicit catalog proof required for article original, fail closed to catalog. Preview has no credentials or transcript payload. |
| UX | Condensed bold hierarchy, low word counts, alternating light/dark, no repeated photo, feed/mobile checked. |
| CX | Alt describes real photo/graphics; immutable fixture clearly distinguished from real review draft. |
| Growth | Product recognition first, no external CTA; fixed four-action ending. No conversion or popularity claim invented. |
| PMO | Narrow release boundary; production execution remains unauthorized. v1 review and podcast preserved. |

## Validation, cost and limitations
- Vitest: 112 passed across contract/workflow/admin/art-v2 and existing routes/quiz/ranking tests.
- Deno: 12 passed, including real codecs, six full-size v2 renders and mock end-to-end/checkpoint resume with no paid calls; Deno check passed.
- Sandbox compositor: six JPEGs in 505ms measured run (cover 196ms, other slides 57–67ms); warm per-slide guard <1000ms passed. This is sandbox CPU evidence, not a production Edge quota guarantee.
- `pnpm validate` was attempted but failed before its validation steps: pnpm tried implicit install and rejected ignored esbuild build scripts. Incidental pnpm lock/workspace files removed; no dependency manifest changes. Its listed regression tests ran separately and passed. Harness automatic build latest entry: `build OK`; full `pnpm validate` is not claimed passed.
- Zero paid AI/Meta calls. JPEG project-asset uploads were used only to make the requested visual preview accessible; monetary storage/tool cost is not exposed.
- Production runtime visual validation intentionally not run because deployment was not authorized. No settings/flags were readjusted or enabled. Original article background remains unavailable without trustworthy identity metadata. Interior v2 slides are graphics-only; unsupported interior bike photo requests fail closed.

## Next step and rollback
Review this gallery and diff first. Hub publication and isolated editorial-admin deploy require separate authorization; only then generate through the authenticated admin with its existing lease/checkpoints. Do not re-render the v1 job implicitly. Roll back by reverting the art-v2 change set; persisted v1 assets/contracts remain compatible and no data rollback is needed.