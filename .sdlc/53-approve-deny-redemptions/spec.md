# Spec — #53 Approve / deny reward requests

## Behaviour
- Rewards modal (🎁) for an **admin** lists every pending request ("Alice — Movie night — 20 pts") with **Approve** and **Deny** buttons. The 🎁 header button shows a small count badge of pending requests (admin only).
- Decision is a `runTransaction` on `state/redemptions/<id>`: it commits only if the entry exists and is still `pending`, setting `status`, `decidedAt`, `decidedBy`. So a request can be decided once, even if two admins tap at the same time on different devices.
- Approve: points stay spent. Deny: after the transaction commits, `cost` is refunded to the requesting member with the existing `refundPoints` transaction. If the member was removed meanwhile, no refund is attempted.
- Members see their last 5 decided requests ("Approved" / "Denied — points refunded") under their pending list, using the existing cap-100 log (oldest decided entries are dropped by #52's logic; pending never dropped).
- Double tap guarded by a busy flag.

## UI states
- Admin: pending list with Approve/Deny (aria-labelled), badge on 🎁.
- Member: own pending + recent outcomes; no decision buttons.
- Readonly TV: nothing new (pending/outcome lists hidden, as in #52).

## Data shape (/state)
`redemptions/<id>` gains `decidedAt` (ms) and `decidedBy` (member name) and `status` in `pending|approved|denied`. No new top-level keys; cap stays 100.

## Security / RBAC
`decideRedemption` starts with `if (READONLY || !isAdminFn()) return;`. Reads names via `esc()`/`jsq()`. Client-side only (DB rules untouched, per guardrails).

## Cost guardrails
Standard free RTDB transaction; one small entry updated per decision; no new deps/services/rules/auth.

## Flagged concerns
Deny commits the status first and refunds second; if the refund transaction fails the entry is `denied` without a refund. A toast tells the admin so it can be fixed manually. (A single multi-path transaction across `/state/members` and `/state/redemptions` would require a root-level transaction, which is heavier and contends with every client.)
