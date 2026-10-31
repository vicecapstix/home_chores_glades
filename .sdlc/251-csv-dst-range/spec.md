# Spec — #251 CSV export "to" bound on DST change days

## Behaviour
- `exportCSV(from, to)` in src/ui.js computes the end bound as the start of the next local day minus 1 ms: `new Date(y, m-1, d+1).getTime() - 1`, instead of local midnight + 86 399 999 ms.
- A 25-hour (autumn) day now includes its last hour; a 23-hour (spring) day no longer includes the next day's first hour.
- Empty "to" still means now; "from" unchanged.

## UI states
Admin Stats CSV export only. Member and readonly TV: unchanged.

## Data shape
None. Read-only export.

## Security / RBAC
No write path. csvField formula neutralising untouched.

## Cost guardrails
No new services or dependencies.

## Flagged concerns
None.
