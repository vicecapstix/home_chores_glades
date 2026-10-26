# Plan #167
- src/render.js `cardHTML`: gate action buttons and subtask section on `!selectMode`.
- Tests: tests/select-mode-inert.test.js (buttons absent in select mode, click toggles once with no action, unchanged outside select mode, restored on exit).
- Rollback: revert the PR (no data change).
