# Spec — #173 Reward hand-out ("Given ✓")

## Behaviour
- An approved redemption without `givenAt` is "to give". Admin sees a **To give (n)** list in the Rewards modal, oldest approval first, each row with a **Given ✓** button.
- Tapping it sets `redemptions/<id>/givenAt` (ms timestamp) and `givenBy` (admin name). `status` stays `approved`. Already-given / non-approved / unknown ids are no-ops.
- Undo toast ("Given") clears both fields.
- Members see their recent decided requests as "Approved — waiting" or "Given ✓ <d MMM>".
- 🎁 badge for admins = pending requests + to-give count.

## UI states
- **Admin:** To give list + Given ✓ buttons + badge. **Member:** status text only, no buttons. **Readonly TV:** no pending/to-give panel (unchanged), badge hidden.

## Data shape (/state)
`redemptions/<id>`: optional `givenAt: number`, `givenBy: string`. No new status value (draft rules allow only pending/approved/denied). Redemptions cap (100) unchanged; `idsToDrop` is unaffected.

## Security / RBAC
`markGiven` starts with `if (READONLY || !isAdminFn()) return;`. Only the two new fields are written via a multi-path `patchRoot`. Rules, PINs, auth untouched. Rules already permit extra fields under `redemptions/$id`.

## Cost guardrails
Spark RTDB only; two small fields per given reward; no new services/deps.

## Flagged concerns
Two parents tapping at once: last write wins on the timestamp (harmless; both mean "given"). Using a transaction was judged unnecessary.
