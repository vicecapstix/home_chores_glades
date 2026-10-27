# Spec — #233 Default chore list ("Add from list")

## Behaviour
- `src/starter.js` ships ~30 common chores as static code (never in the DB, so a wipe can't remove them).
- Admin sees an **Add from list** button in the add-chore bar. It opens a standard modal (`#starter-modal`, `.hidden` pattern, `role=dialog`, covered by `a11y.js`) listing chores grouped by category with a checkbox, frequency and points; per-category "Select all"; **Add selected**.
- Chores whose name already exists (case-insensitive) are ticked, disabled and labelled "already added".
- Add selected → one `patchPaths({ 'tasks/<id>': {...}, nextId })`; tasks are "Anyone", not done, `lastDone` from `initialLastDone`.
- Empty chore list (admin only) shows "No chores yet — Add from list".

## UI states
- Admin: button, modal and empty-state prompt.
- Member: the add-bar is already hidden by CSS (`body[data-role=member] .add-bar`); empty state shows the normal text, no button; `openStarter` is refused.
- Readonly TV: add-bar hidden; no button; all handlers return early.

## Data shape (/state)
No new nodes or fields. Written tasks use the existing task shape; `nextId` is increased by the number added.

## Security / RBAC
`openStarter` and `addStarterChores` start with `if (READONLY || !isAdminFn()) return;`. All names go through `esc()`. IDs are `t<ms+index>`.

## Cost guardrails
Static list (~3 KB) in the bundle, no extra reads, one multi-path write of <=30 small tasks. No rules/auth/URL change, no new services.

## Concerns
Task count has no server-side cap; one click adds at most the ~30 list entries, minus those that exist.
