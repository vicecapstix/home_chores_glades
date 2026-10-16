# Spec — #34 Keep in-progress edits across syncs

## Behaviour
When `_renderTasks` rebuilds the list it first records:
- the task cards that are in inline-edit mode (`.task-card.editing`) or that contain the focused text field (e.g. the "Add subtask…" input), as live DOM nodes;
- which cards have their subtask list expanded;
- any non-empty "Add subtask" text, by task id.
After the rebuild: kept cards replace their freshly rendered twin (so typed text, day chips, selection and caret survive, and focus is restored); expanded subtask lists are re-opened; typed subtask text is put back. Cards that no longer exist (deleted remotely) are dropped. Everything else refreshes as before, so other devices' changes still appear.
`saveTask` leaves edit mode (removes `editing`, blurs) so the post-save snapshot redraws that card normally; Cancel already redraws it.

## UI states
Admin only has edit forms; members/TV have no inputs except subtask add (members are hidden by CSS), and TV is readonly, so behaviour there is unchanged.

## Data shape
None.

## Security / RBAC
No new write paths; rendering only.

## Cost guardrails
None affected. Pass.

## Concerns
While a card is being edited its display is the user's local version; remote changes to that specific card show after Save/Cancel.
