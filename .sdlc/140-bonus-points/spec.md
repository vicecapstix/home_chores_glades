# Spec: bonus / deduction points (#140)

## Behaviour
- Admin Panel -> member row -> "± Points". Two prompts: amount (non-zero integer, -50..+50) and reason (1..60 chars, trimmed).
- Points change via `adjustMemberPoints` (transaction on the live server value). Positive awards also add to `weekPoints`; deductions do not touch week points.
- Deduction beyond the balance: the transaction aborts with `insufficient`; admin is asked to confirm, then retried with `allowNegative`.
- History entry `{ type: 'bonus', person, points (signed), reason, by, completedAt }` appended, `slice(-500)`.
- History modal, CSV export and the last-week leaderboard (via `weekRecap`) show it: "Bonus: <reason>" (escaped), signed points. Bonus entries do not count as completed chores (stats chart, "done" counts).
- Undo toast (5 s): reverses the points (allowNegative) and removes the history entry.

## UI states
- Admin: button in the admin panel row. Member: no button; sees the entry in History and the new points. Readonly/TV: admin panel cannot open (`READONLY` guard); weekly totals include bonus via history.

## Data shape
No new top-level `/state` keys. History entries gain optional `type`, `reason`, `by`.

## Security / RBAC
`if (READONLY || !isAdminFn()) return` in `adjustBonus` and `window.adjustBonus`. Reason rendered via `esc()`. CSV prefix "Bonus: " plus existing `csvField` neutralisation.

## Cost guardrails
One transaction + one history patch per use; no new services, deps or keys; history cap kept at 500.

## Flagged concerns
- Rules are open (`.write: true`), so RBAC is client-side only, as elsewhere in the app.
- History append uses the local cache (same as chore completion); a concurrent write could drop an entry.
- Prompts used instead of a new modal to keep the slice small; a styled modal could follow.
