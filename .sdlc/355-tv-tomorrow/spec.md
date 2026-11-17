# Spec: TV "Tomorrow" panel (#355)

**Behaviour:** on `?readonly=1`, from 18:00 local a compact panel under the points strip lists tomorrow's chores (time, icon, name, person chip in their colour with avatar). Built with `weekPlan(tasks, tomorrow)` so it matches This week: daily/weekdays/everyWeeks, one-offs, next-due dates, switched-off chores (judged on tomorrow's date) and house pause ("⏸ Paused"). Empty day shows "Nothing due". Capped at 12 chips plus "+N more" so the main board never needs to scroll. Chores still overdue tonight are due tomorrow too. Sunday evening uses next Monday.

**UI states:** admin and member (phone/tablet): not rendered (`renderTvTomorrow` returns when not READONLY; the element is `display:none` outside `body.tv`, which also only applies from 900px). Readonly TV: shown from 18:00, cleared before; refreshed by `render()` and the existing 1-minute rollover tick so it appears at 18:00 without a snapshot. Night dimming (21:00) unchanged.

**Data shape:** none. Display only; nothing written to /state or stored on the device.

**Security/RBAC:** no write path. All user text (chore name, icon, person) goes through `esc()`. `src/restore.js` and member rename untouched.

**Cost guardrails:** no reads or writes, no services, no dependencies.

**Flagged concerns:** away members are not filtered, exactly like This week (it doesn't filter them either); can follow up if wanted.
