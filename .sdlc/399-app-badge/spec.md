# Spec: app icon badge with my chores still due today (#399)

## Behaviour
- New `src/appbadge.js`: `remainingToday(tasks, me, now)` = chores assigned to `me` that are overdue or due today and not done (`todayProgress(mine).total - .done`, the same rule as the My done banner, so switched-off, paused, away, skipped and pending-check chores are excluded).
- `updateAppBadge(tasks, me)` runs from `render()`. With a signed-in member and `navigator.setAppBadge`: count > 0 -> `setAppBadge(count)`; 0 -> `clearAppBadge()` (or `setAppBadge(0)` if clear is missing). Signed out -> cleared. Calls are skipped when the value did not change.
- Silently does nothing when the Badging API is missing, and never in READONLY. Promise rejections are swallowed.
- The 60 s rollover re-renders when a due status changes, so the badge follows midnight/due-time changes while the app is open.

## UI states
Admin and member (installed PWA): icon badge only. Readonly TV: nothing. No on-screen change.

## Data shape
None; nothing stored or written.

## Security / RBAC
Display only, no Firebase access, no write path. Uses the logged-in member name already known to the page.

## Cost guardrails
Browser API only; no push service, no server, no deps.

## Concerns
The badge cannot update while the app is closed (no push, by design, per the guardrails).
