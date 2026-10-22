# Spec: collapsed Done section + "Clear done one-offs" (#142)

## Behaviour
- A "stale done one-off" is a task with `freq === 'once'`, `done === true`, and `lastDone` on a local date before today.
- Stale done one-offs are removed from the normal status sections and shown in a collapsed `<details class="done-once">` titled "Done (N)" at the bottom of the task list. Open/closed state survives re-renders.
- One-offs done today stay in the normal "Done" section (still untickable as today).
- Recurring chores (any freq other than `once`) are never moved or deleted.
- Admin sees a "Clear done one-offs" button inside the section. It confirms, then does ONE multi-path update (`tasks/<id>: null` per task) via `patchPaths`, and pushes an undo whose action restores all removed tasks in one multi-path update. The existing 5s undo toast is used.
- History is untouched (it stores `taskName`).

## UI states
- Admin: section with button. Member: section, no button. Readonly/TV (`?readonly=1`): section not rendered at all (and stale done one-offs are hidden from the list).
- Native `<details>`/`<summary>`: keyboard and screen-reader accessible.

## Data shape
No changes to /state. Only deletes `state/tasks/<id>` nodes.

## Security / RBAC
`clearDoneOnes` starts with `if (READONLY || !isAdminFn()) return;`; `patchPaths` also no-ops under READONLY. Button only rendered for admins. Task names escaped via `esc()` in `cardHTML`.

## Cost guardrails
Spark plan, GitHub Pages, no new services or deps. Reduces stored data; nothing automatic; history cap 500 untouched.

## Flagged concerns
- Header stats / filter counts still include stale done one-offs (unchanged).
- Admin clear removes all stale done one-offs, including ones assigned to others (admin sees all tasks anyway).
