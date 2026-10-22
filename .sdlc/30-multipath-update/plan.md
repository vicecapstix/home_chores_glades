# Plan
Files: src/tasks.js, src/members.js, src/render.js, src/ui.js, tests/multipath.test.js (plus existing tests that assert writeState), root build files.
Steps: replace writeState with patchPaths and computed path maps; add tests asserting exact path sets; npm run build:pages.
Test plan: new tests/multipath.test.js, full suite, build.
Rollback: revert the PR; writeState still exists.
