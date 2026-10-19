# Plan — #41

## Files
- src/firebase.js: `initAuth` returns status; add `describeAuthFailure`.
- src/main.js: show toast on auth failure / PERMISSION_DENIED.
- src/auth.js: lockout helpers + guard in `memberPinKey` / pad display.
- firebase-rules.json (new), README.md (Console steps).
- tests/auth-lockout.test.js, tests/auth-init.test.js, tests/firebase-rules.test.js (new).
- Root deploy files via `npm run build:pages`.

## Steps
1. Commit failing tests. 2. initAuth + main toast. 3. Lockout. 4. Rules + README. 5. Full test + build:pages, commit root files.

## Test plan
Lockout (5 fails, locked, expiry, per-member, success clears); initAuth ok/fail + message; rules JSON structure and the history index regex; README mentions steps.

## Rollback
Revert the PR (no data or rules changed). To undo rules after JT applies them: re-paste the open rules from README.
