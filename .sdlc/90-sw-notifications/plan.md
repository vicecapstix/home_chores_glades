# Plan #90
Files: src/notifications.js, src/public/sw.js (+ root sw.js/index.html via build:pages), tests/notifications.test.js.
Steps: failing test -> implement showOverdue() helper (SW path, fallback, success-only marking) -> sw.js notificationclick + cache v2 -> npm test, build:pages.
Test plan: SW path used; SW rejection falls back; constructor throw doesn't break loop nor mark task (retry succeeds); sync fallback unchanged.
Rollback: revert the PR; no data changes.
