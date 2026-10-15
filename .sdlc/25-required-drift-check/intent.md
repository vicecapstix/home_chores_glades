Queue position: 2

Part of #20

## Problem
Follow-up to #24: once root `index.html` is rebuilt (#23), the drift check should fail PRs so merged work can't silently stay off the live site again. The current check only compares `index.html`; root `sw.js`, `manifest.webmanifest` and icons (served from root since #45) can drift too, and `build:pages` copies only `index.html`.

## Outcome / acceptance criteria
- [ ] Drift step no longer `continue-on-error`
- [ ] `build:pages` also copies `dist/sw.js`, `dist/manifest.webmanifest` and icons to root
- [ ] Drift step compares all of them
- [ ] CLAUDE.md deploy section says every PR that changes `src/` must run `npm run build:pages` and commit the root files
- [ ] `tests/ci.test.js` asserts the workflow has no `continue-on-error` on the drift step and the script copies the PWA files

## Affected users
Maintainers; indirectly everyone (stops undeployed merges).

## Constraints
- Cost guardrails: stays on GitHub Pages (`main` / root) and the existing Firebase RTDB on the free Spark plan. No Blaze-only features (Functions, Storage, Extensions), no new services, API keys, secrets or paid hosting. Keep history capped at 500 and reads small. Never write to or change rules on the live DB; tests use mocks only.
- GitHub Actions on the free standard `ubuntu-latest` runner only; no Actions-based Pages deploy.

## Open questions
None. Blocked only by #23 (do after it merges; if #23 isn't merged yet, the daily run should rebase on it or skip to the next bug).

## Verification
`npm test` passes; CI fails on a PR that edits `src/` without regenerating root files.

