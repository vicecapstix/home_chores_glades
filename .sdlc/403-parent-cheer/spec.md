# Spec: Parent cheer (#403)

## Behaviour
- Admin sees a 👏 button on each chore-completion row in the History modal (not bonus, swap or reward rows). One tap sets `cheer: '<admin name>'` on that entry; once cheered the button is replaced by "👏 <name>" for everyone. An entry can only be cheered once.
- The cheered member sees a banner "👏 Mum cheered your Bins" on their next visit, once per device per entry (localStorage `ff_cheer_seen:<member>`, last 50 keys, display only). Several unseen cheers show the newest plus "(+N more)".

## UI states
- Admin: button on uncheered completions; mark on cheered ones.
- Member: mark in History; banner once.
- Readonly TV: banner and button hidden (CSS + READONLY guard). The TV does not show a recent-activity/history list, so no 👏 is added there.

## Data shape
`/state/history[i]` gains optional `cheer` (string, admin member name). No new path; the 500 cap is untouched. Documented in CLAUDE.md.

## Write path
`cheerHistoryEntry(idx, match, by)` in src/firebase.js: `runTransaction` on `state/history/<idx>` only. Aborts unless the live entry still matches completedAt/person/taskId, is not a typed row, and has no cheer. The history array is never rewritten.

## RBAC
Client guards `if (READONLY || !isAdminFn()) return;` in `cheerClick`; helper also checks READONLY. Firebase rules are open on /state (unchanged), so enforcement is client-side like all other admin actions.

## Cost guardrails
No new services, deps, keys. One small transaction per cheer. Spark plan, GitHub Pages only. Check: pass.

## Flagged concerns
- src/restore.js rebuilds history entries and may strip `cheer` on restore (follow-up; not changed here, always-JT).
- Index-based path: if the cap trims or an entry is removed between render and tap, the transaction aborts safely with a toast.
- Cheerer who is also the person (self-cheer) gets no banner.
