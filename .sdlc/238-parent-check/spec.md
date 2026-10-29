# Spec — #238 Parent check: flag, waiting state, approve / send back

## Behaviour
- Chore flag `needsCheck` (checkbox on add form and edit card; saved via the existing multi-path save, `null` when off). Cards show "✓ Parent check".
- Member ticks a needs-check chore → only `checkPending: { by, at }` is written (and `checkNote` cleared). No `done`, points, history, streak or badges. Card shows "⏳ Waiting for parent check" and is "On track", never Overdue. The member who ticked can tick again to cancel.
- Admin sees **Looks good** / **Not yet** on a waiting card.
  - Looks good: the request is taken atomically (`takeCheckPending`, a transaction on `tasks/<id>/checkPending`), then the normal completion runs for `checkPending.by` with `checkPending.at` as the completion time; history entry carries `checkedBy`. A double tap or a second parent gets "Already checked".
  - Not yet: takes the request atomically, stores optional reason (<=100 chars) in `checkNote`; no points.
- Admin ticking a needs-check chore completes it directly (and clears any pending request).
- Unflagged chores are unchanged.

## UI states
- Admin: checkbox in add/edit, tag, waiting card with two buttons.
- Member: tag, tick → waiting (cancel by tapping again). Reason display is #239.
- Readonly TV: tags only (waiting + parent-check); no buttons (guarded in render and by READONLY in handlers).

## Data shape (/state)
Additive optional task fields: `needsCheck: true`, `checkPending: { by, at }`, `checkNote: string`. History entries may carry `checkedBy`. CLAUDE.md updated.

## Security / RBAC
`approveCheck`/`sendBackCheck`: `if (READONLY || !isAdminFn()) return;` plus offline gate. Enforced in-app only until rules v2 (#98), as for all admin actions. All names/reasons via `esc()` (reason is not rendered yet; escaped when #239 shows it).

## Cost guardrails
One tiny transaction per approval; no new listeners, no new services; history cap unchanged.

## Concerns
- Streak: uses tick time; if the member already has a newer streak date, the streak is left alone (avoids moving it backwards).
- Weekly points still land in the week of approval (the week the points are credited), so a week rollover between tick and approval cannot corrupt `weekPoints`.
