# Intent: TV slowly auto-scrolls a section whose chores don't fit (#400)

**Problem**
With many chores the TV cuts off the bottom of long sections and nobody can scroll a TV browser easily.

**Outcome / acceptance criteria**
- [ ] On `?readonly=1`, a section taller than its slot scrolls slowly to the bottom, pauses, and returns to the top
- [ ] Respects `prefers-reduced-motion` (no animation; shows a '+N more' line instead)
- [ ] Paused while night mode (#315) is on; no effect outside the TV view

**Affected users**
Readonly TV view.

**Constraints**
- CSS/JS only, no new library.
- Cost guardrails: GitHub Pages hosting only (`main` / root); Firebase Realtime DB on the free Spark plan (no Blaze, Cloud Functions, Storage, Extensions or paid APIs); no new services, keys, secrets or dependencies; data stays bounded (history cap 500); tests mock Firebase and never touch the live DB.

**Open questions**
None.

**Verification**
Vitest for the overflow decision helper and reduced-motion branch (jsdom has no layout, so test the helper with given sizes). `npm test`, `npm run build`.

