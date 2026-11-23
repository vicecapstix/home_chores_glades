# Plan (#387)
Files: src/tasks.js (submitForCheck stores bonus/mult; approveCheck passes them; applyToggle accepts an override), src/tocheck.js (display), tests/check-keeps-bonus.test.js.
Steps: 1) failing test committed first; 2) implement; 3) npm test/build; 4) build:pages and commit root files.
Test plan: tick Tue with bonus, move bonus to Wed, approve -> bonus kept; same for double points; legacy request without fields; crafted out-of-range values ignored; non-admin/READONLY cannot approve; uncheck reverses lastDonePoints.
Rollback: revert the PR; stored extra fields are ignored by old code.
