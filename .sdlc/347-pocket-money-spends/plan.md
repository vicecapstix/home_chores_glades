# Plan — #347

**Files:** src/firebase.js (`spendPoints`/`refundPoints` also adjust `spent`), src/pocketmoney.js (`owed`, `markPaid` stores `earned`), tests/pocketmoney-spends.test.js, root deploy files.
**Steps:** 1. Commit failing tests. 2. Implement. 3. `npm test`, `npm run build:pages`, commit.
**Test plan:** pure `owed` (spend scenario, refund, deduction floor, old payout fallback, no payouts); `markPaid` records `earned`; spend/refund adjust `spent` (fake DB); READONLY spend writes nothing.
**Rollback:** revert the PR; `spent`/`earned` are ignored by the old code.
