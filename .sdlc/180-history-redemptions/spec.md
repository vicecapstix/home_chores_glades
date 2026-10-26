# Spec #180 — redemptions in History

## Behaviour
- The Activity (history) modal merges three sources, newest first, capped at 50 rows (`HISTORY_LIMIT`), with the member filter applied before the cap:
  - completions (`+pts`), bonus/deduction entries (`type: 'bonus'`, signed, "Bonus: reason" — unchanged),
  - redemption requests: `−cost  🎁 <reward> (requested)` at `requestedAt`,
  - denied redemptions: an extra `+cost  Refund: <reward> (denied)` row at `decidedAt`.
- Approved requests only keep the original debit row.
- Negative amounts use the warn colour (`.hist-pts.neg`); rows otherwise unchanged. All user text through `esc()`.

## UI states
- Admin / member: same modal, more rows. Readonly TV: modal not used; read-only view anyway.

## Data
- None. Computed from `state.history` and `state.redemptions`; nothing new stored, history cap 500 untouched.

## RBAC
- Read-only view; no writes added.

## Cost guardrails
- No extra reads (redemptions already subscribed). No services/deps.

## Concerns
- Redemptions cancelled by the requester are deleted, so they leave no rows (net zero anyway).
- Empty state text remains "No completions yet." (existing test).
