# Spec — #36 keyboard / focus accessibility (partial)

Scope (issue's own re-check on 16 Oct): hover-reveal, focus ring, contrast, tap sizes were already fixed. Remaining and done here:
1. `.check`, `.subtask-check`, `.sel-box` become `<button type="button" role="checkbox" aria-checked aria-label>` so Enter/Space work natively (TV remote, keyboard). Visual appearance unchanged (CSS reset). Tap area grown to 44px via an invisible `::after` hit area (no layout shift).
2. New `src/a11y.js` (`initDialogA11y`): Esc closes the top visible `[role=dialog]` by activating its backdrop handler (so it works for modals opened via modal manager or directly); focus moves into the dialog on open and returns to the opener on close; Tab is trapped inside the open dialog. Driven by a MutationObserver on the `hidden` class, so no change to modals.js (avoids conflict with #37).
3. `toggleSelect` keeps `aria-checked` in sync.

Behaviour by role: identical for admin, member and read-only TV; read-only still guards writes inside toggleTask/toggleSubtask (unchanged). TV remote can now focus and press OK on checkboxes.

Data shape / Firebase / RBAC: none changed. Cost guardrail: no new reads/writes, no deps.

Out of scope (follow-up for #36): verify 44px tap targets for other small controls (subtask-del, move buttons, theme toggles) and a contrast re-audit in both themes; arrow-key navigation between cards; aria-live announcements for toasts.

Concerns: both #37 and #36 are independent; Back-button handling lives in #37. Dialog focus uses the first focusable element in the card.
