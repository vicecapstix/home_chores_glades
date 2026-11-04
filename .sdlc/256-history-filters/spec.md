# Spec — #256 History: filter by chore and by this week / last week

## Behaviour
- Activity modal gains two labelled selects under the member pills: **Chore** (All chores + distinct completion names present in `state.history`, sorted) and **When** (All / This week / Last week).
- Filters combine with the member pill (AND). A chore filter keeps only completions of that chore (bonus and reward rows have no chore, so they drop out).
- Weeks are local Mon 00:00 to next Mon 00:00 (`getWeekStart` / `prevWeekStart`); end is exclusive, so Sun 23:59:59.999 is in, Mon 00:00:00 belongs to the next week.
- Empty result with any filter active: "Nothing here yet." Unfiltered empty keeps "No completions yet."
- Filtered views allow up to 500 rows (the history cap) instead of 50, so a week is not silently cut.
- Opening the modal resets member, chore and period, so closing it or a different member logging in never leaves a stale filter.

## UI states
Admin / member: both selects usable by keyboard (native select, labels, existing focus ring); wraps on phone width. Read-only TV: same display-only view, no write controls.

## Data shape
None. No new fields in /state.

## Security / RBAC
Read-only rendering. Chore names pass through `esc()` in options and rows. No new window handler that writes.

## Cost guardrails
No new services, deps, secrets or DB reads; filters run over already-loaded `state.history`.

## Flagged concerns
History is capped at 500, so "Last week" may be incomplete for busy families (same caveat as #108). Chore filter matches by name, so renamed chores appear as separate entries.
