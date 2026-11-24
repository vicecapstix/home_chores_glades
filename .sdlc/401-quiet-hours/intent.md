# Intent: quiet hours for chore notifications (#401)

**Problem**
Overdue and due-time browser notifications can pop up late at night or before school.

**Outcome / acceptance criteria**
- [ ] A device-local setting (default 21:00–07:00, can be turned off) suppresses overdue, due-time and To check notifications in that window
- [ ] Notifications suppressed in quiet hours are not all fired at once when quiet hours end (at most one summary)
- [ ] Window across midnight works

**Affected users**
Anyone with notifications on.

**Constraints**
- localStorage only, nothing written to /state.
- Cost guardrails: GitHub Pages hosting only (`main` / root); Firebase Realtime DB on the free Spark plan (no Blaze, Cloud Functions, Storage, Extensions or paid APIs); no new services, keys, secrets or dependencies; data stays bounded (history cap 500); tests mock Firebase and never touch the live DB.

**Open questions**
None.

**Verification**
Vitest with fake timers at 20:59 / 21:00 / 06:59 / 07:00. `npm test`, `npm run build`.

