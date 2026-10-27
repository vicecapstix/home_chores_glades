# Intent: dueStatus() ignores its `now` argument for one-off and specific-day chores (#171)

## Problem
`baseStatus(t, now)` in `src/utils.js` uses `new Date()` for `freq: 'once'` and calls `prevScheduledStart(t.days)` without `now` for `weekdays`. Callers that pass a time (`todayProgress(tasks, now)`, the rollover signature, tests) get answers for the real clock instead. Results are wrong around midnight, and tests depend on the wall clock.

## Outcome / acceptance criteria
- [ ] `baseStatus`/`rawDueStatus` use `now` everywhere (once, weekdays, recurring)
- [ ] Existing behaviour unchanged when `now` is omitted
- [ ] Tests: a one-off due tomorrow evaluated with a `now` of tomorrow is 'soon'; a weekdays chore evaluated with a fixed `now` doesn't depend on the system clock (use fake timers to prove it)

## Affected users
Maintainers (correctness of every due tag).

## Constraints
- Cost guardrails: stays on GitHub Pages (`main` / root) and the existing Firebase RTDB on the free Spark plan. No Blaze-only features (Functions, Storage, Extensions), no new services, API keys, secrets or paid hosting. Keep history capped at 500 and reads small. Never write to or change rules on the live DB; tests use mocks only.
- Deploy: run `npm run build:pages` and commit the root files so merging deploys (CI fails on drift).

## Open questions
None.

## Verification
`npm test` passes (including the new tests listed above) and `npm run build` succeeds.

