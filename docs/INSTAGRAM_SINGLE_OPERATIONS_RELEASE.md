# Single-image Instagram official release — 2026-11-14

## Preflight / rollback evidence (05:57 UTC)
- Clean HEAD: `4852643ba147f50a5ec193c11b6638de241dbeb4`.
- Approved SQL SHA-256: `deebd258694bdda3a0ec8af5eb086fba8749a225ff69f621b036e75799183a90`.
- Applied migration rows: 16. Both `instagram_single_settings` and `instagram_single_posts` absent.
- Growth daily: page_view 1,619 rows / 12,190; bike_click 1,229 / 2,515; affiliate_click 645 / 1,470. Hourly: 9 rows / 272.
- Podcast: feed=true, scheduler=true, Instagram=false. Carousel: generation=false, publishing=false, automation=false. OUXI reviewHold=true; six historical published Instagram deliveries.
- Existing active jobs: 1 sync-bike-catalog-hourly (`7 * * * *`); 2 bike-image-worker-15min (`3,18,33,48 * * * *`); 3 bike-profile-worker-15min (`8,23,38,53 * * * *`); 6 youtube-editorial-hourly (`12 * * * *`); 7 youtube-editorial-drain (`* * * * *`); 8 price-alert-hotpipe (`* * * * *`); 9 vitale-newsletter (`*/5 * * * *`); 10 vitale-classifieds-billing (`* * * * *`); 11 vitale-podcast-release (`0,10,15-19,22,30,40,45-49,52 * * * *`); 12 vitale-podcast-instagram-schedule (`* * * * *`). No single-image job existed.
- Edge `editorial-admin` configuration: verify_jwt=false, unchanged. Code rollback base is the preflight HEAD; never reactivate legacy Instagram publishers.
- Managed requester session unavailable: official self-session mint reports no matching application account. No artificial account, bypass, approve or prepare request will be used; owner/Codex must prepare through authenticated Admin.

## Execution / postflight
- Submitted the exact tracked SQL to official migration with name `instagram_single_operations`. The tool refused before application: sub-hourly schedule totals 144 checks/day and requires a first-line scheduling-review comment. Such checks can increase Cloud costs even without work; no monetary estimate is available. The request requires byte-exact SQL, so no comment was added and no altered retry was made.
- Readback: 16 migration rows, both new tables absent, zero `vitale-instagram-single` jobs. There are no new-table permissions or automation flag to verify because nothing was created. All applied 0000–0015 files remain untouched.
- Official isolated deployment of only `editorial-admin` succeeded. Submitted source/settings SHA-256: `95cd7b2c7e6643c7e241f975929c2c706039f744ff3254bae566038141dba12b`; verify_jwt=false remains unchanged. No frontend Publish.
- Protected `instagram-single-list` with invalid bearer returned 403 JSON `{"error":"Acesso não autorizado."}`. No real admin session exists for this requester; no prepare/approve request, private-media upload or Meta action occurred. The authenticated list/prepare path remains blocked by both the missing schema and session.
- Postflight legacy flags unchanged: feed/scheduler=true, podcast Instagram=false, all carousel gates=false, OUXI hold=true, historical publications=6. Growth clicks unchanged (2,515 bike / 1,470 affiliate); live traffic increased page_view to 12,191 and hourly to 273 (9 hourly rows). No Growth writes were performed.
- Automatic preview build reports build OK at 05:57:39 UTC; no repeated local suites or paid AI calls.
- Next action requires owner approval to prepend the tool-required review comment (changing the SQL hash), or a platform-supported byte-exact execution path. After schema application, Codex/owner can use Admin → Instagram → Preparar rascunho for selected `Mi6l7WhLdT4`; confirm review, 1080×1350 and the two caption endings, without approving/scheduling. Do not activate automation before readback.