# Plan
- src/rewards.js `renderRewards`: row options use the requester (me, my points) for Request and the pick only for goalId.
- Tests: tests/rewards-request-self.test.js (failing first), covering disabled state, limit text, goal still targets picked member.
- Steps: docs commit, failing test commit, fix commit, build:pages commit.
- Rollback: revert the PR; no data changes.
