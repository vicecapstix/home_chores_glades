# Spec: docs drift (#223)

## Verified against code (main 077c74a)
- Status pills (`src/render.js` `_renderFilters`): **Mine** (signed-in only), **All**, **Pending**, **Overdue**, **Done**, plus category pills and **📈 My progress**. README said "All / Pending / Overdue / Done today".
- README feature list missing: Every N days (`'interval'` freq), Skip this time, house Pause, member Away mode, admin **± Points** bonus/deduction, Saving goal, Family goal (team goal), rotate assignee, avatars/rename, Add from list (starter chores), Print chart, This week planner, My progress, Auto/Light/Dark theme, backup download/restore.
- CLAUDE.md task shape missing fields written by `src/tasks.js`: `freq: 'interval'`, `intervalDays`, `rotation`, `skippedAt`, `prevLastDone`, `lastDoneWeek`, `prevStreak`, `prevStreakDate`.
- CLAUDE.md member shape missing `colorIdx`, `avatar`, `awayUntil`, `awaySince`, `goalRewardId`, and badge ids beyond the original four (see `BADGES` in `src/config.js`).
- CLAUDE.md `/state` tree missing `pause: { until, by, since }`.
- RESET.md: still accurate; adds a pointer to Admin Panel → Restore backup as a non-destructive alternative to wiping.

## Behaviour / UI / data / RBAC
None. Docs and a drift-guard test only. No code, data shape, rules or auth changes. Root deploy files unchanged by `build:pages`.

## Cost guardrails
No hosting or service changes mentioned; GitHub Pages + Spark plan only.

## Concerns
Docs can drift again; `tests/docs.test.js` now derives the pill labels and task fields from `src/` so future drift fails CI.
