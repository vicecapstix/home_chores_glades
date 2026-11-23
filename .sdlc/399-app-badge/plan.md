# Plan (#399)
Files: src/appbadge.js (new), src/render.js (one call in render()), tests/appbadge.test.js.
Steps: failing tests first; implement; npm test/build; build:pages.
Test plan: count rules; set/clear; unsupported API; READONLY; signed out; rejection swallowed; unchanged value not re-sent; render() calls it.
Rollback: revert the PR.
