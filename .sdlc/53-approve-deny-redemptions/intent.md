# Intent — #53 Rewards: admin approves or denies redemption requests (deny refunds points)

(Copied from issue #53; part of epic #50)

## Problem
Requests from #52 sit pending until a parent acts. JT decided (14 Oct) redemptions need parent approval.

## Outcome / acceptance criteria
- [ ] Admin panel shows pending requests (badge count) with Approve / Deny
- [ ] Approve sets `status:'approved'`, `decidedAt`, `decidedBy`
- [ ] Deny sets `status:'denied'` and refunds `cost` to the member atomically (`runTransaction`)
- [ ] Guards: `if (READONLY || !isAdminFn()) return;`; a request can only be decided once
- [ ] Member sees the outcome on their requests list
- [ ] Tests (approve, deny+refund, double-decide no-op, non-admin no-op)

## Affected users
Admin (decides), members (see outcome).

## Constraints
Cost guardrails (Pages + Firebase Spark, no new services). Redemptions stay capped at 100. Needs #52 merged (it is).

## Open questions
Resolved (JT, 14 Oct): parent approval required; deny refunds.
