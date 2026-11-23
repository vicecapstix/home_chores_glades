# Plan (#398)
Files: src/config.js (TV_MEMBER), src/tv.js (tvMember, tvMemberTasks, strip for one member), src/render.js (_visibleTasks), tests/tv-member.test.js.
Steps: failing tests first; implement; npm test/build; build:pages.
Test plan: URL parsing with cycle/text; resolve exact/case-insensitive/unknown/empty; task filter (person + Anyone); header strip one chip, escaped; ignored when not READONLY.
Rollback: revert the PR.
