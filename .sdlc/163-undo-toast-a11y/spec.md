# Spec #163 Undo toast pointer events and a11y

## Behaviour
- `#undo-toast` takes pointer events only with `.show` (inline `pointer-events:auto` moved to CSS as `#undo-toast.show`), so the hidden box no longer swallows taps over the bulk bar / last cards.
- Undo is `<button type="button" id="undo-btn">` with aria-label set per toast: "Undo delete of <name>" (or "Undo <verb> <label>" for custom verbs). Keyboard/remote focusable with visible focus outline.
- Toast has `role="status"` `aria-live="polite"`.
- At <=480 px both toasts get a max-width and the undo toast sits above the status toast.

## UI states
Admin: bulk bar/deletes unblocked. Member: phone taps fixed. Readonly TV: no writes so undo toast never shows. Label/aria text set via `textContent`/`setAttribute` (no innerHTML, no XSS).

## Data / RBAC / cost
No /state changes, no writes, no rules. Undo logic itself unchanged (guards remain where pushUndo is called). Spark plan unaffected.

## Concerns
Toast timing (5 s) and other a11y gaps stay in #36. Not visually verified on a phone in the sandbox.
