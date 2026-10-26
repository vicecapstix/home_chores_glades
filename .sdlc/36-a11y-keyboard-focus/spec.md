# Spec: #36 keyboard, focus and tap-target accessibility

## Behaviour
- Tap targets: at <=480 px `.subtask-del`, `.move-btn` and the header icon buttons (`.theme-toggle`) get min 44x44 px.
- Contrast: every `.tag-*` token pair >= 4.5:1 in light and dark. Dark `.tag-ok`/`.tag-easy` used `--accent` (#2D6A4F) on `--accent-light` (1.88:1); new token `--accent-fg` (light = accent, dark = #7BD3A0, ~7:1).
- Arrow keys: Up/Down on a chore's check button (or the select-mode box) focuses the previous/next card's check. Ignored while a dialog is open. Works with a TV remote D-pad (sends ArrowUp/Down).
- Focus after re-render: `_captureInProgress` records the focused button's task id, its first CSS class and its index among same-class buttons in the card; `_restoreInProgress` refocuses the equivalent new node.
- Toast: `toastDuration(msg)` = clamp(60 ms x length, 5 s, 10 s).
- Tab pills: leaderboard, stats, history pills and the main filter pills carry `aria-pressed`, updated on click.

## UI states
- Admin / member: all of the above. Readonly TV: arrow nav, toast, contrast, aria-pressed on filters all apply; no new controls.

## /state data changes
None. Display and keyboard only.

## RBAC
No writes added; no new guards needed.

## Cost guardrails
No Firebase reads/writes, no new services or deps. Spark plan unaffected.

## Concerns
- Focus restore for dynamic elements uses first class name; fine for the existing buttons (check, edit-btn, del, move-btn, subtask-toggle, btn-claim).
- Subtask delete / header buttons are bigger on phones, so the header wraps slightly more.
