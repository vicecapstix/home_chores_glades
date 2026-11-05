# Plan #275
Files: src/utils.js (initialLastDone), tests/template-start-date.test.js.
Steps: failing test first -> unwrap kind -> build:pages.
Test plan: every frequency x 4 dates (1 Mar, 31 Jan, 29 Feb leap, mid month) compared with Add form value; dueStatus not overdue.
Rollback: revert PR; no data change.
