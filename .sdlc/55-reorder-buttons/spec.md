# Spec — #55 Reorder with buttons

## Behaviour
- Admin gets a **Reorder** button in the header. Toggling it shows ▲ / ▼ buttons on every card (`body[data-reorder]`). Turning it off hides them.
- ▲/▼ moves a task one place up/down **within its section** (Available, Overdue, Due soon, Upcoming, Done). The first card has no ▲ effect and the last no ▼ (disabled).
- Insert semantics: the moved task takes its neighbour's slot and the neighbour shifts one place (not a swap of two arbitrary cards). Implemented by re-assigning the section's existing `order` values (sorted) to the new sequence; if values are duplicated/zero they are renumbered `min+index`. Only tasks whose `order` changed are written, via one `patchRoot({'tasks/<id>/order': n, ...})` multi-path update. `writeState()` is no longer used for reordering.
- The Available section now sorts by `order` like the others.
- HTML5 drag-and-drop is removed (`initDragDrop`, `draggable`, drag CSS).

## UI states
- Admin: Reorder toggle + ▲▼ (aria-labels "Move <task> up/down", 40px targets, keyboard focusable).
- Member: no Reorder button, buttons hidden by `body[data-role="member"]`; function guarded anyway.
- Readonly TV: guard `READONLY` returns early; buttons hidden (`body[data-readonly]`).

## Data shape
No change; existing `tasks/<id>/order` numbers.

## Security / RBAC
`moveTask` starts with `if (READONLY || !isAdminFn()) return;`. Client-side only; rules untouched.

## Cost guardrails
Writes shrink (2 small paths instead of whole `/state`). No deps/services. Pass.

## Concerns
Moving across status sections is not possible by design (sections are computed from due status). Removing drag-and-drop removes mouse dragging for desktop admins; buttons replace it.
