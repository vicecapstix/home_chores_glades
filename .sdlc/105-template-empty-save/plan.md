# Plan — #105
Files: `src/ui.js` (saveTemplate, renderTemplates, applyTemplate, deleteTemplate; import patchPaths), `tests/templates.test.js` (new), root deploy files via `npm run build:pages`.
Steps: 1) failing test commit; 2) implement; 3) `npm test`, `npm run build:pages`; 4) PR.
Test plan: empty save refused; cap 20 templates; cap 100 tasks; legacy template without `tasks` renders "0 tasks" and applies without throwing; save writes only `templates/<id>`; delete writes null path; non-admin no-op.
Rollback: revert the PR (no data migration; data shape unchanged).
