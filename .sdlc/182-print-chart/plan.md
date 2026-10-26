# Plan #182

## Files
- `src/printchart.js` (new): `weekDates`, `dueDays`, `chartRows`, `chartHTML`, `printChart`.
- `src/index.html`: Print chart button in Admin Panel; `#print-chart` container.
- `src/main.js`: `window.printChart`.
- `src/style.css`: screen-hidden container + `@media print` rules.
- `CLAUDE.md`: list module.
- Tests: `tests/printchart.test.js`, `tests/printchart-readonly.test.js`.
- Root build via `npm run build:pages`.

## Rollback
Revert the PR; no data changes.
