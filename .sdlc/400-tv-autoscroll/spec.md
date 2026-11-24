# Spec: TV auto-scroll of overflowing sections (#400)

## Behaviour
- On `?readonly=1` (TV, `READONLY`), each chore section (`.section` inside `#task-list`) is capped at 62vh with `overflow: hidden` (CSS under `body.tv`, 900px+ breakpoint, where the grid layout applies). The section header is sticky so the title stays visible.
- New `src/tvscroll.js`: a 100 ms tick looks at each section. When `scrollHeight - clientHeight` exceeds a 4 px tolerance it scrolls at ~20 px/s: pause 4 s at the top, scroll down, pause 4 s at the bottom, jump back to the top.
- `prefers-reduced-motion: reduce`: no movement, the section stays at the top and its header shows "+N more" (N = chores whose card is cut off).
- Night mode (#315, `isTvDim()`): scrolling is held (sections rest at the top); it resumes when the screen wakes or morning comes.
- Scroll position is kept per section key (`data-k`), so a re-render from a snapshot doesn't restart the scroll.

## UI states
- Readonly TV: as above. Admin / member views: module does nothing (`READONLY` false: the tick is never started; the CSS is `body.tv` only). Phones/tablets (<900px): no height cap, nothing overflows, tick is a no-op.

## Data shape
None. Display only; no Firebase access, nothing stored (not even localStorage).

## Security / RBAC
No write path, no user data injected into HTML (the "+N more" text is a number in a `data-more` attribute rendered via CSS `attr()`). No rules/auth/PIN/CI/deps change.

## Cost guardrail check
No network. A 100 ms timer reading three or four layout boxes on the TV only.

## Flagged concerns
jsdom has no layout, so tests exercise the pure helpers and a stubbed-size DOM; the visual result needs one look on the real TV (see PR).
