# Intent — #215: Editing an 'Every N days' chore never saves N (intervalDays missing from the save)

Queue position: 1

## Problem
`saveEdit` in `src/tasks.js` sets `state.tasks[id].intervalDays` locally (~line 172), but the multi-path `paths` object it writes (~lines 181-187) has no `intervalDays` key. Changing a chore from every 3 to every 10 days reverts to 3 on the next snapshot; switching weekly → every N days writes `freq:'interval'` with no N so `freqDays` falls back to 7 (wrong due status and points); switching away leaves a stale `intervalDays` on the server.

## Outcome / acceptance criteria
- [ ] Saving an edit writes `tasks/<id>/intervalDays` with the new N
- [ ] Switching to a non-interval frequency writes `intervalDays: null`
- [ ] Due status and `taskPoints` reflect the saved N after a fresh snapshot

## Affected users
Admin (edits), members and readonly TV (wrong due status/points).

## Constraints
- Cost guardrails: stays on GitHub Pages (`main` / root) and the existing Firebase RTDB on the free Spark plan. No Blaze-only features (Functions, Storage, Extensions), no new services, API keys, secrets or paid hosting. Keep data bounded (history cap 500) and reads small. Never write to or change rules on the live DB; tests mock Firebase.

## Open questions
None.

## Verification
New Vitest test asserting `patchPaths` receives `'tasks/a/intervalDays': 12`, and `null` after switching to weekly (the current test in `tests/interval.test.js` only checks local state). `npm test` and `npm run build` pass.

