# Spec — #239 "To check" list for parents

**Behaviour.** Admins get a ✅ header button with a count, hidden at 0, for members and on the TV. It opens `#tocheck-modal` (standard `.hidden` pattern, `a11y.js` handles focus/Esc) listing waiting chores oldest first: chore, child, time ticked, points (with double-points day at the tick time), and **Looks good** / **Not yet**, which call the existing `window.approveCheck` / `window.sendBackCheck` (#238, which keep the admin guard and atomic take). The list re-renders on every snapshot while open. A child's card shows "Not yet: <reason>" while `checkNote` is set, the chore is not done and no request is pending; the existing tick path already clears `checkNote`. `runToCheckNotify` shows one local "N chores to check" notification per day per device (localStorage date key) when permission is granted.

**UI states.** Admin: button, modal, notification. Member: card note only; button hidden, `openToCheck` is a no-op. Read-only TV: nothing (READONLY check).

**Data shape.** None. Reads `checkPending` / `checkNote` from #238. One localStorage key `ff_tocheck_notified` (date string), device-local.

**Security / RBAC.** No new write path: actions reuse #238 handlers that already check READONLY/isAdmin. All names/reasons pass through `esc()`/`jsq()`.

**Cost guardrails.** No new listeners or reads; no push service; local notification only.

**Concerns.** None.
