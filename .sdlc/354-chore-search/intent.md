# Intent — #354: Search box to find a chore by name

**Problem:** With 30+ chores the list gets long on a phone; no way to jump to one chore except scrolling or category filters.

**Acceptance criteria**
- [ ] A search input above the chore list filters cards by case-insensitive name/notes match as you type
- [ ] Works together with existing filters (Mine, category, status)
- [ ] Clear (x) button and Esc clear it; empty result shows 'No chores match'
- [ ] Not shown on the readonly TV
- [ ] Input has a label for screen readers

**Constraints:** render-time filter only; no state or Firebase changes; no `src/restore.js` / member rename changes; free-tier/no-deps guardrails.
