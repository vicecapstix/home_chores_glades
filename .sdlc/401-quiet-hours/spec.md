# Spec: quiet hours for chore notifications (#401)

## Behaviour
- New device-local setting in localStorage `ff_quiet` (JSON `{on, start, end}` in minutes after midnight). Default on, 21:00-07:00 (a window across midnight works). Nothing is written to /state.
- While quiet hours are active, the overdue check, the due-time check and the "to check" notification show nothing and mark nothing as seen.
- Overdue/due-time chores that were held back set a device flag `ff_quiet_held`. When quiet hours end, the first check sends **one** summary ("N chores need your attention", tag `ff-quiet-summary`) covering both kinds, marks those chores as notified, and clears the flag; if only one chore was held it is shown normally. The "to check" notification is already once a day, so it simply fires after quiet hours as before.
- A header button (🔕 / 🔔 style, next to the bell) toggles quiet hours on/off. It is hidden until notifications are granted, and never shown on the TV.

## UI states
- Admin / member (phone, tablet): button visible once notification permission is granted; title/aria-label say "Quiet hours 21:00-07:00: on. Tap to turn off".
- Readonly TV: no button, no notifications (existing `READONLY` guards).

## Data shape
None in /state. localStorage only: `ff_quiet`, `ff_quiet_held`.

## Security / RBAC
No write path to Firebase. Values read from localStorage are validated (minutes 0-1439) before use. No rules/auth/PIN/CI/deps change.

## Cost guardrail check
No network, no Firebase, no new services.

## Flagged concerns
The window is fixed at the default in the UI (only on/off is exposed); `start`/`end` are honoured if present in storage. A different window can be a follow-up if wanted.
