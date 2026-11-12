# Spec: chore swap (#228)

## Behaviour
- A signed-in member taps the swap icon on their own pending chore card, picks a sibling and sends an offer.
- The sibling sees "Swap offers for you" above the task list with Accept / Decline. The offerer can also cancel via decline.
- Accept sets `tasks/<id>/person` to the recipient, removes the offer (one multi-path `update`), appends a history note (`type:'swap'`, 0 points, not counted as a completion) and registers an undo.
- An offer is expired (decided at read time) when older than 24 h, or the chore is done, was reset/completed since (`lastDone` differs from the one stored), reassigned, or the recipient no longer exists. Expired offers are never applied; accept cleans them up, and the next offer prunes them.
- Rules: only the chore's current assignee may offer; chore not done; recipient is another existing member; one open offer per chore; max 50 open offers (toast when full).

## UI states
- Member: swap icon on own pending cards (hidden if sole member or an offer is already open); incoming offers section; picker modal (`#swap-modal`, role=dialog, covered by a11y.js).
- Admin: same as member when signed in as a member; sees the reassignment on the card/history. No admin-only controls.
- Read-only TV (`?readonly=1`): no icon, no offers section, all swap functions return immediately.

## /state data shape
`swaps/<sw+timestamp> = { id, taskId, taskName, from, to, offeredAt, lastDone }` (`lastDone` is an extra field used to detect a reset). Carried in `applySnapshot`, the `main.js` snapshot mapping and `writeState()` exactly like `claims`. Not included in backup/restore (transient).
History note: `{ type:'swap', taskId, taskName:'Swap: X (A → B)', person:B, from:A, points:0, completedAt }`, appended via `appendHistory` (500 cap). Completion counters that used `type !== 'bonus'` now use `!type`.

## RBAC notes
Honour-system app (rules are open `state` read/write, unchanged): enforcement is client-side by `currentMember()`. Offer: assignee only. Accept: named recipient only. Decline: recipient or offerer. READONLY blocks all writes.

## Cost guardrails
GitHub Pages + existing RTDB on Spark; no Functions/Storage/new services/keys. Data bounded: <= 50 offers of ~150 bytes, history cap 500 retained, no new listeners (rides the existing `/state` listener). No rules or live DB changes; tests mock Firebase.
