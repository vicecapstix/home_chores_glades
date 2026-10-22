# Spec 107
- `setLbTab` clears `.active` only on `#leaderboard-modal .lb-tab` (previously every `.lb-tab` on page, wiping Stats tabs and History pills). `setStatsTab` is already scoped to `#stats-modal` (verified; test added).
- History pills: new `historyFilterClick(event)` in history.js resolves `event.target.closest('[data-member]')` and ignores clicks that miss a pill (gap, container). index.html calls it instead of reading `event.target.dataset.member`. Empty-string data-member (Everyone) still works.
- UI states: identical for admin, member, read-only TV; purely client-side view state.
- Data: none. No writes, no RBAC change. member names stay esc()'d in the pill markup (unchanged).
- Cost guardrail: no reads/writes/deps.
- Concern: existing tests/week-recap.test.js fixture put tabs outside the modal; fixture moved inside `#leaderboard-modal`.
