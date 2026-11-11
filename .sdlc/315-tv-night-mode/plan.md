# Plan: TV night mode

**Files:** src/tv.js (night helpers, cycle pause hook), src/rollover.js (call updateTvNight), src/style.css (overlay), tests/tv-night-mode.test.js, root index.html.

**Test plan:** boundaries 20:59/21:00/06:29/06:30; wake and expiry; cycle pause/resume; non-TV not dimmed; no Firebase/storage use. **Rollback:** revert the PR.
