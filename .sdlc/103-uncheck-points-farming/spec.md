# Spec — #103

## Behaviour
- Points award/reversal go through one atomic helper, `adjustMemberPoints(name, opts)` (`runTransaction` on `state/members/<name>`), applying a delta to the live server value instead of writing absolutes from the local cache.
- Check stores `lastDoneWeek` (the Monday `YYYY-MM-DD` it counted in) on the task.
- Uncheck:
  - Non-admin: refused inside the transaction (nothing written) when balance < `lastDonePoints`; toast "Points already spent — ask a parent".
  - Admin: always allowed; `points` may go negative (no clamp).
  - `weekPoints` is reduced only when `lastDoneWeek` equals the current week (legacy tasks: derived from `lastDone`); otherwise week fields are untouched.
  - `completedCount` still decremented (floored at 0).
- Leaderboard shows negative totals as-is.

## UI states
- Admin: uncheck works; may show negative points. Member: toast on refusal, task stays checked. Readonly/TV: no writes (READONLY guard); sees negative totals.

## Data shape
Task gains optional `lastDoneWeek` (string, cleared on uncheck). No other /state change.

## Security / RBAC
Client-side only (server enforcement belongs to epic #95). Existing READONLY/isAdmin guards unchanged; the refusal runs atomically, so a stale cache cannot bypass it.

## Cost guardrails
No new services/deps; one small transaction per check/uncheck on the existing RTDB (Spark).

## Concerns
Existing tests asserting `patchMember({points})` change because points now go via the transaction helper (intentional). Overlaps #31/#32 not re-scoped (streak/lastDone/history untouched).
