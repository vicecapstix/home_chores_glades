# Spec — #52 Members request a reward

## Behaviour
- Each reward row in the Rewards modal gets a **Request** button for a logged-in member (also admins acting as themselves). It is disabled when the member's points < cost.
- Request: (1) check the 100-entry cap, (2) atomically deduct `cost` from `state/members/<me>/points` with `runTransaction` (aborts if balance too low, so double-spend is impossible), (3) write `state/redemptions/<id>` with status `pending`. If step 3 fails the points are refunded.
- Cap: at 100 entries the oldest non-pending entries are dropped in the same multi-path write; if all 100 are pending the request is refused with a toast.
- Undo (5 s toast, existing undo stack): refunds the points and deletes the entry, only if the entry is still `pending` (an admin may have acted).
- The member sees their own pending requests in the modal; the admin sees "N pending request(s)" (approval/denial is #53).

## UI states
- Member: Request buttons + own pending list.
- Admin: same, plus pending count and catalog edit controls.
- Readonly TV / no logged-in member: no Request buttons, no pending list (list only).

## Data shape (/state)
`redemptions: { "<id>": { id, rewardId, rewardName, cost, member, requestedAt, status:'pending' } }`, max 100. `members/<name>/points` changes via transaction. `writeState()` carries `redemptions` through so full writes cannot wipe it.

## Security / RBAC
`if (READONLY) return;` and the member is always `currentMember()` (no parameter), so a member can only request for themselves. Reward cost/name are read from the catalog, not from the UI. Client-side enforcement only (DB rules are open and untouched). Output escaped with `esc()`/`jsq()`.

## Cost guardrails
Spark plan; `runTransaction` is a standard free RTDB feature; ≤100 small entries; no new dependency/service/rules/auth change.

## Flagged concerns
Weekly points (`weekPoints`) are not reduced by spending, so the weekly leaderboard still reflects effort. Deny/refund and approval are #53.
