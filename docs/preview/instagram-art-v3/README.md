# Instagram V9 Max — private v3 review

Open `01.jpg` through `06.jpg` from this private repository checkout. Each is an actual sRGB JPEG 1080×1350 exported by this project's Deno compositor, not Gemini output or a new production job. Review at 390px width. The six images and their feed-size copies were inspected individually; no clipping, missing wheels, overlapping copy or duplicate bike was observed.

## Inputs and reproduction
- Factual fixture: `src/lib/instagram/art-v3.fixture.ts`, using the previously verified AHHPeeQE11k transcript excerpts. This is review copy, not a fresh full-transcript editorial approval.
- Official photograph: `src/assets/bikes/v9-max.jpg`, 1074×992. Its real format is **PNG**, despite the filename; runtime detects bytes, not extension.
- Original article background: internal `editorial-covers` object `2b052856-77e1-46fe-b9b6-97d2fe7603f1/backgrounds/d3532656-13d8-483f-967d-b009c194d338.png`, 1376×768. Read-only retrieval succeeded. Metadata lacks catalog identity proof, so its generated bike was not reused.
- Only the left environment rectangle `(0,0,420,768)` is used, visually checked to contain **no bike and no lettering**. This crop is of the environment, never of the official bike. The complete official raster is contained in the foreground, with connected-white background removal. This is an existing-scene composite, not a newly generated photograph. The private `environment.png` review input is versioned beside the JPEGs so regeneration needs no database or network.

```sh
deno run --allow-read --allow-write --sloppy-imports scripts/instagram-art-v3-preview.ts src/assets/bikes/v9-max.jpg docs/preview/instagram-art-v3 docs/preview/instagram-art-v3/environment.png
```

DEV-only comparison gallery: `/admin/instagram?artPreview=3` on a working local checkout, switching between v2/v3. This is **not** a hosted preview/production URL promise; production intentionally removes the gallery import. In this sandbox the full route returned an empty response; testing used an isolated mount of the exact same gallery with the project's styles. All six local imports decoded at 1080×1350, next/previous navigation and v2 switch passed on a 390px viewport, with page width 390 and no console errors. Global layout in that isolated mount made the visible frame 342px; the separate 390px contact sheet verifies the requested feed scale. Authentication was not weakened. The normal Admin now labels the saved job's art version separately from its revision; it does not present offline v3 as the real v1 draft.

## Slide progression
1. Whole real bike and photographic street context establish the night topic.
2. Light diagrams distinguish presence/power supply from unmeasured luminous reach.
3. Declared load and untested weight are separated typographically, not treated as hill performance.
4. Unscaled route line explains the observed climb without invented degrees.
5. Seta/buzina callouts turn the findings into concrete checks rather than universal endorsement.
6. Topic question and all four actions close the conversation without external CTA.

See `docs/INSTAGRAM_ART_V3_REVIEW.md` for tests, governance, limitations and rollback. No deployment, paid AI, Meta, settings changes or real draft edits.