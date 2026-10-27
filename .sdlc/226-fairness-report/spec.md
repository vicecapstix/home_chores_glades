# Spec — #226 Fairness report (admin)

## Behaviour
Admin Panel gets a "Fairness report" button opening a modal. It shows, per member, chore points and completions over the last 28 days, computed only from `state.history` (cap 500; a note says so when the cap is reached). Alongside, how many of those completions were "Anyone" chores (task has no assigned person now). Members more than 30% above or below the family average of points are tagged "Doing a lot" / "Doing less". Bonus/deduction and reward entries (entries with a `type`) are ignored. A removed member's history is ignored. Average is over current members (a member with 0 counts); if the average is 0 nobody is flagged.

## UI states
Admin: button + modal. Member: button not rendered (inside Admin Panel) and `openFairness` returns for non-admins. TV (`?readonly=1`): not reachable, `openFairness` returns on READONLY.

## Data shape
None. No Firebase reads or writes beyond the existing snapshot.

## Security / RBAC
`if (READONLY || !isAdminFn()) return;` in `openFairness`. Member names through `esc()`. Numbers only otherwise.

## Cost guardrails
No new data; computation is local over ≤500 entries.

## Concerns
"Anyone" is judged by the task's current `person` (history stores no assignment); a task deleted since counts as assigned. Documented in the PR.
