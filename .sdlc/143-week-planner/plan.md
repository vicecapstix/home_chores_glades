# Plan: week planner (#143)

## Files
- `src/utils.js`: `weekPlan` pure helper.
- `src/week.js` (new): `weekHTML`, `renderWeek`, `openWeek`.
- `src/index.html`: header button + `#week-modal`; `src/style.css`: modal rule pair + layout; `src/main.js`: `window.openWeek`.
- `tests/week-plan.test.js`; rebuilt root `index.html`.

## Steps
1. Helper + tests (each frequency, pause, week boundary, escaping).
2. Modal markup/CSS/handler. 3. `npm test`, `npm run build:pages`.

## Rollback
Revert the PR; no data or rules touched.
