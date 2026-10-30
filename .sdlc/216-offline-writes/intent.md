# Intent — #216: Changes made while the cached copy is showing are silently dropped, with misleading toasts

Queue position: 2

## Problem
Since the offline cache (#146), `src/firebase.js` write helpers return silently while `_live` is false (cached start, `main.js` until the first live snapshot). `spendPoints` returns `false` and `adjustMemberPoints` returns `{reason:'readonly'}`. Result on weak Wi-Fi: ticking a chore says 'Member update failed', requesting a reward says 'Not enough points', and Save template / Apply template / Set goal show success toasts but vanish at the next snapshot. The offline banner says changes 'will sync when you reconnect', which isn't true here.

## Outcome / acceptance criteria
- [ ] Write entry points show one clear message (e.g. 'Still connecting — try again in a moment') instead of success or a wrong reason
- [ ] `spendPoints`/`adjustMemberPoints` report a distinct `'offline'` reason
- [ ] No success toast is shown for a write that was not sent
- [ ] Banner text while showing cached data is accurate

## Affected users
Members and admin on phones/tablets with weak Wi-Fi.

## Constraints
- Cost guardrails: stays on GitHub Pages (`main` / root) and the existing Firebase RTDB on the free Spark plan. No Blaze-only features (Functions, Storage, Extensions), no new services, API keys, secrets or paid hosting. Keep data bounded (history cap 500) and reads small. Never write to or change rules on the live DB; tests mock Firebase.
- Do not queue writes in localStorage for later replay (out of scope; risk of overwriting newer data).

## Open questions
None.

## Verification
Tests with `setWritesEnabled(false)`: `requestReward` does not toast 'Not enough points'; `saveTemplate` shows no success toast; banner text check.

