# Spec: Pocket money (#229)

## Behaviour
- Admin sets a display-only rate "N pts = $X" (Admin panel > Pocket money). Stored at `state/pocketMoney = {pts, amount}`; absent = feature off. It never changes points.
- Owed per member = (member.points - points at last payout) -> amount at the rate, floored to cents, never negative. No payouts yet: all points count.
- Admin "Mark paid" (per member row in the Admin panel) appends a payout and shows an Undo toast.
- CSV export (existing "Export CSV" in Stats) gets one row per payout in range (`task` = "Payout by <admin>", `points` = member's all-time points at payout). The JSON backup already copies members, so `payouts` is included.

## UI states
- Admin: rate form (Set / Off); "Mark paid" button on each member row only when a rate is set.
- Member (signed in or not): chip shows "$3.70 (37 pts)" next to points when a rate is set; nothing when off.
- Readonly TV (`?readonly=1`): same text on the TV strip chips, display only; no buttons, all writes return early.

## Data shape
- `state/pocketMoney`: `{pts: int 1-1000, amount: number 0.01-1000, max 2 decimals}`
- `state/members/<name>/payouts/p<at>`: `{at: ms, by: member name, points: all-time points at payout}`; newest 52 kept (oldest keys nulled in the same multi-path update).

## RBAC
- setPocketMoney / clearPocketMoney / markPaid: `if (READONLY || !isAdminFn()) return false;`. Rules are open (`state` .write true) as for every other feature; no rules change is made.

## Cost guardrails
- No new services; GitHub Pages + existing RTDB. One tiny root key, <=52 small entries per member. Writes are single multi-path `update`s; no extra reads or listeners.

## Notes
- Restore (`src/restore.js`) clones unknown member fields, so `payouts` survives; it does not restore root `pocketMoney` (same as teamGoal/doublePoints). Restore untouched.
