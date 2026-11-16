# Intent — #347: Pocket money owed drops to 0 after a child spends points on a reward

**Problem:** `owed()` computes `points − points at last payout`. Spending points on a reward lowers `points`, so after a payout at 100 pts, an 80-pt reward (→20) and 30 new pts (→50), the chip shows 0 owed instead of 30.

**Acceptance criteria**
- [ ] Owed = points earned since the last payout, unaffected by reward spends or refunds in between
- [ ] The example above shows 30 pts owed
- [ ] Bonus/deduction entries still count (a deduction lowers owed, never below 0)
- [ ] Existing payout records keep working (no data migration; `payouts` shape unchanged)

**Constraints:** display-only; new field only on new data, fall back to the old formula for old payouts; free-tier/no-deps guardrails.
**Open question (default assumed):** spending points does NOT cancel pocket money for those points.
