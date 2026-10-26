# Spec: extra job claims (#224)

## Behaviour
- Rewards modal (🎁) gets an "Extra job I did…" form (job name <= 60 chars, points 1-20, "Ask for points"). Shown to any signed-in member, hidden on the TV (`?readonly=1`) and when nobody is selected.
- A submitted claim is stored as pending at `state/claims/<id>`. The member sees their own waiting claims.
- Admin sees "N extra jobs awaiting approval" in the same modal, each with an editable points box (1-20, default = suggestion), Approve and Deny. The 🎁 badge counts pending claims too.
- Approve: removes the claim first (so a double tap or two parents cannot award it twice), then awards the points through `adjustBonus` (atomic `adjustMemberPoints` + exactly one `bonus` history entry "Bonus: <job>" + the existing undo toast). If the award fails, the claim is put back.
- Deny: removes the claim; no points, no history.
- Cap: 20 pending claims per member. Approved/denied claims are deleted, so the node stays small.

## UI states
- Admin: pending list with Approve/Deny. Member: form and own pending list. Read-only TV: nothing shown; the TV sees resulting points through the existing leaderboard/history.

## Data shape (`/state`)
`claims: { "cl<timestamp>": { id, member, name, points, requestedAt } }` (new, optional). `applySnapshot`, the snapshot call in `main.js` and `writeState` carry it; absent = `{}`.

## Security / RBAC
- `submitClaim`/`decideClaim` start with `if (READONLY) return` ; `decideClaim` also requires `isAdminFn()`.
- Names are `esc()`'d in HTML and ids are `jsq()`'d in onclick strings.
- Client checks are UX only (as elsewhere); server-side enforcement is the #95 epic. No rules/auth/PIN changes. The draft `firebase-rules.json` is untouched (JT: when rules v2 land, `claims` needs a member-create / admin-delete rule).

## Cost guardrail check
Free Spark RTDB, one small new child of `/state` already covered by the existing listener (no new listener), <= 20 tiny entries per member. No new services, deps, keys. Stays on GitHub Pages.

## Flagged concerns
- Not included in JSON backup/restore (pending claims are transient).
- The admin's points box is re-rendered when any snapshot arrives while the modal is open, which can reset a half-edited number.
