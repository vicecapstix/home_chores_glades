# Plan — #256
Files: src/history.js (periodRange, choreNames, opts on historyEvents/historyHTML, historyOptChange, resetHistoryFilters), src/index.html (two labelled selects), src/main.js (window.historyOptChange), src/style.css (.hist-opts), tests/history-filters.test.js, root deploy files via `npm run build:pages`.
Steps: spec, tests + implementation, `npm test`, `npm run build:pages`, PR.
Test plan: chore list/filter, esc, AND with member, Last/This week boundaries at Monday midnight (fake timers), empty-state line, reset on reopen, readonly/no-write, markup labels.
Rollback: revert the PR; no data changes.
