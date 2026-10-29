# Intent: No tests for notifications once-per-day and main.js bootstrap (#40)

## Problem
Re-checked 22 Oct: every `src/` module except `main.js` is now imported by at least one test, and firebase write helpers, `cardHTML` escaping and the overdue-notification selection are covered. Remaining gaps: `main.js` bootstrap (snapshot → applySnapshot → resets → render order, READONLY setup) and no coverage report.

## Outcome / acceptance criteria
- [x] firebase.js write helpers tested with a mocked SDK
- [x] render.js: cardHTML escaping (section grouping still worth a test)
- [ ] notifications.js: only-once-per-day logic (dedupe across the 30-min checks)
- [ ] main.js: bootstrap order test with mocked Firebase
- [ ] Coverage report script (`vitest --coverage`, dev dependency only)

## Affected users
Maintainers.

## Constraints
- Cost guardrails: stays on GitHub Pages (`main` / root) and the existing Firebase RTDB on the free Spark plan. No Blaze-only features (Functions, Storage, Extensions), no new services, API keys, secrets or paid hosting. Keep history capped at 500 and reads small. Never write to or change rules on the live DB; tests use mocks only.
- No network; mock Firebase.

## Open questions
None.

## Verification
`npm test` passes (including the new tests listed above) and `npm run build` succeeds.

