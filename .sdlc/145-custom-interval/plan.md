# Plan
Files: src/utils.js (validInterval, freqDays, freqLabel, taskPoints, initialLastDone), src/tasks.js (add/edit/reset), src/ui.js (templates), src/index.html + src/main.js + src/style.css (form), firebase-rules.json (draft), tests/interval.test.js, root deployed files via build:pages.
Steps: helpers -> form -> templates -> tests -> build:pages.
Tests: tests/interval.test.js (N-1/N/N+1 reset and due, points, template round trip, invalid N, skip, pause).
Rollback: revert the PR; tasks with freq 'interval' fall back to a 7-day cycle.
