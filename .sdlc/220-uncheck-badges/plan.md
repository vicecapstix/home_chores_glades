# Plan (#220)
Files: `tests/uncheck-badges.test.js` (new), `src/tasks.js`, `CLAUDE.md` (task data shape), root `index.html` (rebuilt).
Steps:
1. Commit failing tests: 10th completion unticked → `getting_started` removed; 3rd streak day unticked → `consistent`
   removed; old badges kept.
2. First fix (superseded): compare BADGES before/after the uncheck.
3. Review round (28 Oct): commit failing tests for an old badge re-reached then unticked, and for a stale
   `lastDoneBadges` after a reset. Fix: `completionAward()` computes the new badges once; check stores them as
   `lastDoneBadges` in the task patch; uncheck revokes only those from the live member badges. Added tests: concurrent
   badge kept, member unticks own chore, failed badge write shows a toast.
4. JT chose option B (28 Oct): also require the recorded badge's check to fail after the untick; test for a later
   chore keeping the count at 10.
5. `npm test`, `npm run build:pages`, commit root files.
Rollback: revert the PR. Leftover `lastDoneBadges` values are harmless (nothing else reads them).
