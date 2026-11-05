# Plan #227
Files: src/utils.js (nextStreak, freezeCount, freezeTag, currentStreak), src/tasks.js (completionAward, prevFreezes, undo), render.js/ui.js/tv.js (display), CLAUDE.md + README.md (docs), tests/streak-freeze.test.js.
Steps: pure helper -> wire into completionAward -> uncheck restore -> display -> docs -> tests -> build:pages.
Tests: earn, cap, spend, 3-day gap, pause, same-day, clamping, display, toggleTask + uncheck integration.
Rollback: revert PR; extra fields are ignored by older code.
