# Plan — #94

## Files
src/utils.js (`todayProgress`), src/goal.js (new: flag helpers + `renderGoal`), src/render.js (call renderGoal), src/index.html (#goal element), src/style.css, tests/daily-goal.test.js, root deploy files.

## Steps
1. Commit docs + tests. 2. Helper. 3. goal.js + markup + CSS. 4. `npm test`, `npm run build:pages`, commit.

## Test plan
Helper: weekday, once with dueDate, overdue, skipped, nothing due. Flag: once per day. renderGoal: aria attributes, hidden when empty, celebrates once on transition.

## Rollback
Revert the PR; the localStorage key is harmless.
