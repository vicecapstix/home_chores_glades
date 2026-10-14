# Spec — #21 Port accessibility work from deployed index.html into src/

## Behaviour
Re-apply every change from commit ab7f07c (PR #16, previously hand-patched into root `index.html`) to the sources, so the next `npm run build` keeps them:
- `role="dialog" aria-modal="true" aria-labelledby` on all 6 modal overlays (summary, stats, leaderboard, templates, setpin, admin-panel); titles get matching ids.
- `aria-label` on icon-only header buttons, `Close` on every `.lb-close`, `Delete` on both PIN pad delete keys.
- Inputs associated with labels (`label for=` / `.sr-only`).
- `.sr-only`, skip-link, `:focus-visible` ring, larger `.del`/`.edit-btn`/`.subtask-del` tap targets.
- `<main id="main-content">` landmark; skip link targets it.
- Darker `--muted/--warn/--soon` (AA contrast) + dark-theme overrides for `--warn/--soon`.
- Numeric/Backspace keyboard support for both PIN pads (moved into `src/main.js`, not inline script).
- Section headings render as `<h2>`; toast has `role="status" aria-live="polite"`.

## UI states
Admin / member / readonly TV: identical markup, no visual change except contrast/focus ring/larger tap targets. No new controls.

## Data shape
None. No change to /state.

## Security / RBAC
No write paths added. The PIN keyboard handler only calls the existing window.memberPinKey/setPinKey (which keep their own guards).

## Cost guardrail check
Pure HTML/CSS/JS. No services, deps, or DB reads.

## Flagged concerns
- Root `index.html` is deliberately NOT regenerated (issue #21 constraint; #22 badges still pending). Merging this PR therefore does not change the live site until #22 lands and the root file is rebuilt.
