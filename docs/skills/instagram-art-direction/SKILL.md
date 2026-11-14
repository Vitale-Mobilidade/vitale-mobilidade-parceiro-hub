---
name: instagram-art-direction
description: Editorial intent drives Vitale carousel v3 composition, explanatory graphics and faithful photographic layers.
version: 3
---

# Instagram art direction v3

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