# Plan — #108
Files: src/utils.js (prevWeekStart, weekRecap, lastWeekChampion), src/ui.js (tab + lastWeekHTML), src/tv.js (champion chip), src/index.html (tab button), src/style.css (2 small rules), tests/week-recap.test.js, root deploy files via `npm run build:pages`.
Test plan: week boundaries (Sun 23:59 / Mon 00:00), ties, empty week, truncation flag, esc of names, TV chip, leaderboard tab render.
Rollback: revert the PR; no data changes.
