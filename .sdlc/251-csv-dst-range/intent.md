## Problem
Found by the weekly deep bug hunt (reproduced under `TZ=Europe/London`). The Stats CSV export date range computes the end as local midnight + 86 399 999 ms (`src/ui.js`). On a 25-hour DST day the last hour is excluded; on a 23-hour day the first hour of the next day is included.

## Outcome / acceptance criteria
- [ ] The "to" bound is `new Date(y, m-1, d+1).getTime() - 1` (end of the local day)
- [ ] An entry at 23:30 on the autumn DST day is included; 00:30 the day after the spring DST day is excluded

## Affected users
Admin exporting CSV (families in DST time zones).

## Constraints
- Cost guardrails: stays on GitHub Pages (`main` / root) and the existing Firebase RTDB on the free Spark plan. No Blaze-only features (Functions, Storage, Extensions), no new services, API keys, secrets or paid hosting. Keep data bounded (history cap 500, redemptions cap 100) and reads small. Never write to or change rules on the live DB; tests mock Firebase.

## Open questions
None.

## Verification
Vitest run with `process.env.TZ='Europe/London'` (or a vi.stubEnv-free date fixture): export to=2026-10-25 includes a 23:30 entry.

