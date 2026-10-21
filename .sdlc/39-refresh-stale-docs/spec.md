# Spec: refresh stale docs (#39)
## Verified against code
- PR #75 already fixed the house-PIN/CORRECT_HASH text and CLAUDE.md deploy wording (kept as is). The 5-attempt PIN lockout does exist (`src/auth.js`), so that README sentence stays.
- Stale and fixed: README title, FB_URL location (`src/config.js` line 1) plus the build:pages step, "no build step", Pages deploy step (root files), member permissions, missing features, pointer to #41. CLAUDE.md: file tree (new modules, tests, CI, root deployed files), undo expiry (clears all, not pops oldest), task `days`/`dueTime`, `weekdays` freq, rewards/redemptions data shapes.
- Not touched: RESET.md (left to the master PIN decision issue).
## Behaviour / UI / data / RBAC
None: docs and one drift-guard test only. No code, data shape, rules or auth changes.
## Cost guardrails
No paid hosting mentioned; Pages and Spark plan only.
## Concerns
Docs can drift again; `tests/docs.test.js` guards the name, FB_URL pointer, npm steps and that CLAUDE.md names every `src/*.js`.
