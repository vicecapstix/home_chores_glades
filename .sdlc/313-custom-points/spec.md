# Spec — #313 Custom points per chore

## Behaviour
Optional `pointsOverride` (whole number 1–50) on a task. `validPoints(v)` (utils.js) returns the integer or 0; `taskPoints(t)` returns the override when valid, else `baseByFreq × difficulty`. Everything that already calls `taskPoints` (card "+N pts", TV, tick award, history, parent-check payout, starter list) therefore agrees; uncheck reverses `lastDonePoints`, which was recorded from the same value. The double-points multiplier applies on top as today.

## UI states
- Admin: a "Pts" number input (1–50, blank = formula) in the Add form and the Edit card.
- Member: sees "+N pts" on the card; no input.
- Readonly TV: "+N pts" from the same `taskPoints`; no input.

## Data shape (/state/tasks/<id>)
`pointsOverride: number` (integer 1–50), omitted when unset (written as `null` on edit to clear). Kept in templates (`templateTask`/`applyTemplate`), chore file download/upload (`buildChoreFile`/`validateChoreFile`). Starter list is static code and is unchanged. No migration; old tasks have no field.

## Security / RBAC
`addTask`/`saveTask` keep `if (READONLY || !isAdminFn()) return;`. Value is coerced through `validPoints` everywhere it is read (task, template, uploaded file, restored backup), so a crafted value cannot award more than 50 or a non-number. It is only ever rendered as a number (no HTML injection).

## Cost guardrails
One optional number per task; no new reads/writes/services/dependencies. History cap unchanged.

## Concerns
Raising a chore's override lets future ticks earn more; past history is unchanged. Admin-only by design.
