# Spec #162 TV layout keyed on body.tv

## Behaviour
- TV rules move from `body[data-readonly]` inside `@media (min-width:1200px)` to `body.tv` inside `@media (min-width:900px)`.
- 900-1199px: 2 columns (overdue | soon, then done/available/ok full width). >=1200px: 3 columns as today.
- <900px: unchanged list layout (phone in view-only mode).
- Task names 1.4rem in the TV layout; `minmax(0,1fr)` columns + `overflow-wrap:anywhere` + `overflow-x:hidden` prevent horizontal scroll at 960x540, 1280x720, 1920x1080.

## UI states
- Admin / member: no `body.tv` class (only added when `?readonly=1`), so unaffected.
- Readonly TV: new layout. Readonly phone (<900px): list.

## Data / RBAC / cost
- No /state changes, no writes, no Firebase reads added. CSS only. Spark plan unaffected.

## Concerns
- Cannot visually test on a real TV in the sandbox; verified by CSS tests only.
- `body.tv` is set by `initTvMode()` at bootstrap; before then (first paint) the list layout shows briefly.
