# Spec: #252 week planner colours
- `src/week.js` `weekHTML()` colours each assignee chip with `memberColor(name)` (stored `colorIdx`), like chips, cards and History. Unknown / "Anyone" keeps the muted fallback.
- Admin, member and TV (`?readonly=1`) views: display only; no write path, no Firebase access, no `/state` change.
- Security: names still pass through `esc()`; colours come from the fixed `PCOLS` table, not user input.
- Cost guardrails: untouched.
