# Spec — #45 Installable PWA
Behaviour: web app manifest (name FamilyFlow, standalone, theme #2D6A4F, SVG + 192/512 PNG icons incl. maskable) linked from src/index.html. Service worker `sw.js`: same-origin GET only, network-first (fresh index.html whenever online, cache fallback offline); cross-origin requests (Firebase RTDB, Google Fonts, Auth) are never intercepted or cached. Registration guarded (needs serviceWorker support, https or localhost, production build); failures are swallowed.
UI states: admin/member — installable from the browser menu; readonly TV — also installable, works with last cached shell offline (data still needs Firebase). No visible UI added.
Data shape: none. RBAC: none. Cost: static files on GitHub Pages; no push messaging; no new services.
Files live in src/public (Vite copies to dist/); committed root copies are inert until the root index.html is rebuilt (draft PR #60). `postbuild:pages` copies them to root on every `npm run build:pages`.
Concerns: SW cache holds only same-origin assets (index.html, manifest, icons) so staleness is bounded; bump CACHE name to purge.
