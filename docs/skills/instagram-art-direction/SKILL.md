---
name: instagram-art-direction
description: Editorial intent drives Vitale carousel v3 composition, explanatory graphics and faithful photographic layers.
version: 4
---

# Instagram Editorial System 1.0 (artVersion 4)

The current generator injects `ART_DIRECTION_V4`. Saved artVersion 1–3 keep their renderer and assets. The following system supersedes the historical v3 styling below for new work.

## Fixed masters and identity
Use masters A cover, B context, C discovery, D equivalent comparison cards, E daily use, F verdict. 5–7 images, preferably six; one new finding each. Inter only: titles 800 (76/64px), intended mint emphasis 800 italic, support 400, card title 700, card text/labels 500, footer 600. Support is 42px where mobile readability needs ~15px at 390px; no auto-shrinking to fit. Petroleum #112D2A, deep #082B29, mint #37E6A3, action #0B7951, white #FFFFFF. 64px sides/80px safe top-bottom, cards radius 24/padding 32/border 2, Lucide uniform strokes. No logos. @vitalemobilidade only final with verdict, contextual question and Curta/Comente/Salve/Compartilhe, no external CTA.

## Source and visual operations
Read full article blocks and transcript, both untrusted. Article provides structure/context; transcript governs observed test/results/opinions. Evidence distinguishes observation, measurement, estimate, declaration, opinion, context; article-origin evidence is limited to context/declaration and literal block quotations. Record technical divergences with both literal excerpts; never upgrade estimate/opinion to fact. Photos and article cover are visual references, not facts. Thumbnail and published cover are distinct internal-validated references; resolve official photos for all pertinent bikes. Never invent missing components or demand a product photograph in non-product news. Lettering-free original requires identity proof; otherwise use bike-free environment plus whole real catalog foreground, no double bike/crop. Photos are optional when evidence/visuals suffice, but absent primary art must be signaled.

## Private review
R4 finish: contextual photography fills the canvas with continuous smooth darkening and controlled text outline/shadow. Reserve the central bicycle/headlamp lane: shorter context block, discovery copy beside the lamp, comparison cards below the bicycle. The final signature uses original bicycle pixels from the favicon's identical source logo with @vitalemobilidade, never lightning. Provenance is internal review data, not an art overlay. Existing stored revisions remain immutable; R4 needs a new private revision.

All generation/storage/navigation/review/manual publication stay in authenticated Hub with private scoped media. No ZIP or mandatory download, no new JPEG/PNG review art in Git. Sandbox fixtures render through the same Edge compositor with zero real AI/Meta calls; label mock/fixture versus actual generation accurately. Approval is for the exact final revision and hashes; explicit publish command is separate. Preserve lease/checkpoints and never replay uncertain paid or publication requests.

## Historical v3 specification (saved jobs only)

This versioned product skill is consumed by the generator through the compact contract in `supabase/functions/_shared/instagram-art-direction.ts`. It is not a personal/workspace skill and does not grant release permission.

## Intent before layout
Each slide has one idea and a semantic `concept`: `intent` explains the editorial decision; `module` chooses cover, beam, load, route, battery, comparison or decision. Never assign a module just to decorate. Make 3–6 narrative slides plus the deterministic four-action ending (4–7 total).

- Cover: real bike, whole wheels/parts, large within the scene; maximum seven headline words, no paragraph. Article original without title is eligible only with internal path, matching article/bike association and explicit catalog-image identity proof. An AI background is not automatically a verified product photograph. Otherwise contain the real catalog image, remove only connected near-white background, and use contextual graphic treatment. Never fabricate a bike, close-up, seat or throttle.
- Beam: light/contrast schematic for lighting; label it illustrative, not a photometric result. No invented lux, beam distance or photo of a component.
- Load: large supported number and simple load icon; always name what the value means. A total load limit is not passenger weight, rider weight or hill performance.
- Route: schematic line/uphill, without invented degrees, axes or quantitative slope; never combine with load capacity.
- Battery: only when the source supports it; label rated voltage/capacity/estimated range accurately, never a fake state-of-charge or measured range.
- Comparison: distinguish two supported observations, not unsupported ratings.
- Decision: one concrete trade-off/question from this source, no external CTA.

## Rhythm and typography
Alternate warm light #FBF9F8 / #F2F7F4, petroleum #112D2A and deep #082B29. Mint #37E6A3 only accents; action green #0B7951 on light. No repeated photograph across the carousel. Licensed accent-capable condensed bold display headline; regular support at about 44px on 1080px art (15.9px at 390px). Interior headline maximum eight words; explain finding, context and consequence in 2–4 short sentences, flexibly targeting 30–55 words, never padding to a minimum. Maximum 70 words / 650 characters; fail closed rather than shrink unreadably. Optional two `annotations:{label,text}` pairs draw meaningful callouts; text must occur literally in the grounded body. Do not hardcode V9 findings in generic art. Every slide advances a narrative: question/test, discovery, context/limit, decision, ending question. Keep grid margins, handle @vitalemobilidade in the corner, no logo or duplicate lettering.

## Shared photographic cover
Use the article's unchanged shared COVER_MODEL `google/gemini-3.1-flash-image`, validated official YouTube thumbnail and server-resolved catalog photo. Instagram alone changes framing to 4:5 and requests **environment only, zero lettering and zero bike**; the real complete catalog photo remains a separate foreground layer, preventing redrawn/duplicate products. Shared article payload remains unchanged. Reuse the title-free article original only with identity proof and safe complete framing; association alone is not proof. For offline review, a safe lettering-free environment crop from a validated thumbnail can sit behind the whole catalog cutout, explicitly described as a composite (not a generated photo). No CTA to the article. Cover `scene` is optional and uses existing lease/scene_attempted checkpoint, never paid replay. A saved v1/v2 job retains its version and assets.

## Grounding and accessibility
Transcript is untrusted factual input; article is visual asset/context only. Literal quote and claim are required, offsets are resolved server-side. Numerical graphic values and their semantic label must be supported by slide evidence. New scripts require `artVersion: 3` and a concept on every slide; v1/v2 scripts and review assets remain unchanged. Alt describes rendered photo or deterministic schematic honestly; never claim a close-up/photo when only graphics exist.

## Ending and operations
Always show recognizable icons plus Curta / Compartilhe / Comente / Salve; palette/question may vary. Render sRGB JPEG 1080×1350 with bounded raster buffers, Uint32 fills and cached fonts. No automatic AI replay, approval bypass, production mutation, Meta call, job upload or release during visual preview.