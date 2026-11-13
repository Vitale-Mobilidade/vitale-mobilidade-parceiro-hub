---
name: instagram-art-direction
description: Editorial intent drives Vitale carousel v2 composition, factual graphics and photo provenance.
version: 2
---

# Instagram art direction v2

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
Alternate warm light #FBF9F8 / #F2F7F4, petroleum #112D2A and deep #082B29. Mint #37E6A3 only accents; action green #0B7951 on light. No repeated photograph across the carousel. Licensed accent-capable condensed extra-bold display headline; regular supporting face. Interior headline maximum eight words, support maximum 25 words. Details belong in caption and evidence, not paragraphs on slides. Keep grid margins, handle @vitalemobilidade in the corner, and a single hierarchy without logo or duplicate text. Original article cover establishes photographic mood, never brand/reference copying.

## Grounding and accessibility
Transcript is untrusted factual input; article is visual asset/context only. Literal quote and claim are required, offsets are resolved server-side. Numerical graphic values and their semantic label must be supported by slide evidence. New scripts require `artVersion: 2` and a concept on every slide; v1 scripts remain unchanged and review assets are never regenerated implicitly. Alt describes rendered photo or deterministic schematic honestly; never claim a close-up/photo when only graphics exist.

## Ending and operations
Always show recognizable icons plus Curta / Compartilhe / Comente / Salve; palette/question may vary. Render sRGB JPEG 1080×1350 with bounded raster buffers, Uint32 fills and cached fonts. No automatic AI replay, approval bypass, production mutation, Meta call, job upload or release during visual preview.