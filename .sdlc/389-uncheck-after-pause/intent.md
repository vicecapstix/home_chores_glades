# Intent: uncheck after a pause/away finds its history entry (#389)

**Problem**
Uncheck finds the history entry by `completedAt: t.lastDone` (src/tasks.js ~400 and ~261). When a pause or away period ends, `computeResumePatch` (src/pause.js ~33-35) and `computeReturnPatch` (src/away.js ~30-32) shift `lastDone` forward — including chores that are still done. Unchecking afterwards reverses the member's points but can't find the history row, so last week's leaderboard, team goal, fairness, progress and CSV still count it, and the streak isn't restored.

**Outcome / acceptance criteria**
- [ ] After a pause or away shift, unchecking a chore ticked before the pause removes its history entry
- [ ] Points, completedCount and streak are restored as for a normal uncheck
- [ ] Reset freezing during the pause still works (chores don't come back due early)
- [ ] Chores ticked after the pause are unaffected

**Affected users**
Admin (uncheck), member (history/leaderboard accuracy), TV (champion/team goal).

**Constraints**
- Prefer an additive unshifted tick-time field (e.g. `lastDoneAt`) or shifting `prevLastDone` instead of a done chore's `lastDone`; don't rewrite existing history. Don't change src/restore.js here (always-JT for the review gate).
- Cost guardrails: GitHub Pages hosting only (`main` / root); Firebase Realtime DB on the free Spark plan (no Blaze, Cloud Functions, Storage, Extensions or paid APIs); no new services, keys, secrets or dependencies; data stays bounded (history cap 500); tests mock Firebase and never touch the live DB.

**Open questions**
None.

**Verification**
Vitest: tick Mon → computeResumePatch / computeReturnPatch → uncheck Fri → history empty and points 0 (both pause and away cases). `npm test`, `npm run build`.

