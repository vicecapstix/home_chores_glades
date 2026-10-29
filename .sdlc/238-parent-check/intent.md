# Intent — #238: Parent check: flag on chores, tick goes to waiting, parent approves or sends back

Queue position: 2

Part of #237

## Problem
Chores that need a parent to check the work give points the moment a child ticks them.

## Outcome / acceptance criteria
- [ ] Add-chore form and the edit card have a **"Needs parent check"** checkbox (default off); saved as `tasks/<id>/needsCheck: true` (written as `null` when unticked) via the existing multi-path save
- [ ] Cards for these chores show a small "✓ Parent check" tag
- [ ] A member ticking a needs-check chore writes `checkPending: { by, at }` only — no points, history, streak, badges or `done`. Card shows "⏳ Waiting for parent check"; the chore is not shown as overdue while waiting
- [ ] The member can cancel their own pending check (tap again / Undo)
- [ ] An admin sees **Looks good** and **Not yet** on a waiting card. Looks good runs the normal completion for the child who ticked (points via the existing atomic path, one history entry with `checkedBy`, streak/badges), using `checkPending.at` as the completion time, then clears `checkPending`. Not yet clears `checkPending` and stores an optional reason (≤100 chars) in `checkNote`
- [ ] Approve/send-back are guarded: `if (READONLY || !isAdminFn()) return;`; a double tap or two parents can't award twice (clear the pending first, restore on failure, like #224's claims)
- [ ] An admin ticking a needs-check chore completes it directly
- [ ] Chores without the flag behave exactly as today
- [ ] Readonly TV shows the waiting tag and no buttons; all names/reasons use `esc()`

## Affected users
Admin, members, readonly TV.

## Constraints
- Cost guardrails: stays on GitHub Pages (`main` / root) and the existing Firebase RTDB on the free Spark plan. No Blaze-only features (Functions, Storage, Extensions), no new services, API keys, secrets or paid hosting. Data stays bounded (history cap 500); no new listeners. Never write to or change rules on the live DB; tests mock Firebase.
- Additive fields only (`needsCheck`, `checkPending`, `checkNote`); update CLAUDE.md's task data shape.
- Aim ≤300 changed lines excluding the bundle.

## Open questions
Defaults from the epic #237.

## Verification
Vitest (mocked Firebase): flag saved/cleared on edit; member tick writes only `checkPending` (no points/history); approve awards points once with `checkedBy` and completion time = `checkPending.at`; double approve awards once; send back stores the reason and no points; non-admin and READONLY refused; admin tick completes directly; unflagged chores unchanged; XSS in reason escaped. `npm test` and `npm run build` pass.

