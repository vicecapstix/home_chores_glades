# Spec #165 Service worker network timeout

## Behaviour
- Same-origin GETs race `fetch` against a 3 s timeout. Timeout + cached copy: serve cache (navigations also fall back to the cached `./` shell); the network response still updates the cache when it arrives (kept alive via `event.waitUntil`).
- Timeout with no cached copy: wait for the network, unchanged. Fast network: network response. Offline (fetch rejects): cache, then `./` (unchanged).
- Cache name `familyflow-shell-v3` so the activate handler drops v2 and clients pick up the worker.
- Cross-origin (Firebase, auth, fonts) and non-GET untouched.

## UI states
Admin, member and TV all benefit; no UI change. A stale shell may show for one load on a slow link until the next load picks up the refreshed cache.

## Data / RBAC / cost
No /state or rules changes, no Firebase reads. Existing Cache API only. Spark plan unaffected.

## Concerns
- sw.js is a classic script (no modules), so logic stays in `shellResponse()` and tests load the file in a `vm` context with mocked `fetch`/`caches`.
- Serving stale shell on slow links is intended; data freshness comes from Firebase.
