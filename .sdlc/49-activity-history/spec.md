# Spec — #49 Activity history view

## Behaviour
- New 🕘 header button opens an "Activity" modal (`#history-modal`, CLAUDE.md modal pattern, `openModal/closeModal`).
- Lists the 50 most recent completions from existing `state.history`, newest first: member chip, task name, relative/absolute time, `+points`.
- Filter pills: "Everyone" + one per member; filtering applies before the 50 cap.
- Entries with no person (Anyone tasks) show as "Anyone". Empty state: "No completions yet."
- Re-renders on filter change and each time the modal opens.

## UI states
- Admin / member: button visible, modal read-only.
- Readonly TV view (`?readonly=1`): button visible (read-only data, no write controls), large enough to read; list scrolls within the card.
- Mobile: card is full-width up to 480px, max-height 80vh, rows wrap.

## Data shape (/state)
None. Reads `history` only; cap of 500 unchanged. No new writes.

## Security / RBAC
No write path, so no READONLY/isAdmin guard needed. All user text (task names, member names) passes through `esc()`; filter buttons use `jsq()`-safe attributes via data attributes (no member name in inline JS).

## Cost guardrails
No new Firebase reads (history already synced), no new deps/services, bundle growth small.

## Flagged concerns
- Task `#43`: 'Anyone' completions may not be recorded in history yet; they show once that bug is fixed.
- History entries lack per-entry timezone; times shown in the viewer's local time.
