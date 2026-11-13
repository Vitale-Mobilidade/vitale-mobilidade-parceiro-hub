# Instagram v2 — review files

Open `01.jpg` through `06.jpg` directly from this private repository checkout (GitHub file view or local image viewer). All six are JPEG 1080×1350, copied byte-for-byte from the already rendered compositor output; no re-render, AI, design change or production write was performed.

The development gallery uses local `?url` imports of these files instead of CDN pointers. Its dynamic import is guarded by `import.meta.env.DEV`; hosted production-build previews still show the normal admin login, intentionally. No authentication relaxation or production preview route was added.

Validation: Pillow decoded and verified all six files and exact original-byte equality. The isolated gallery loaded all six from `127.0.0.1`, natural dimensions 1080×1350; slide/feed navigation passed. The full local route currently encounters an unrelated SSR React dispatcher error (`RootComponent` / `useEffect`); a local preview restart did not resolve it. This delivery does not claim the full route is working: the versioned JPEGs are the reliable review deliverable. No extensive suites or paid calls ran.

The older CDN pointers are retained to avoid breaking earlier previews; this gallery no longer imports them. Production, settings, real review job, Edge functions and podcast remain untouched.