# Spec: safe CSV export (#91)
## Behaviour
- `csvField` (exported from `src/ui.js`): string fields starting with `= + - @ TAB CR` get a leading `'` (neutralises spreadsheet formulas); fields containing `,` `"` CR or LF are wrapped in quotes with `"` doubled. Numbers (points) are emitted as-is, never prefixed.
- `exportCSV` header becomes `date,time,person,task,frequency,difficulty,points`; date = `localDateStr` (YYYY-MM-DD, device-independent, sortable), time = local `HH:MM`.
## UI states
- Admin: unchanged Export CSV button in stats. Member / read-only TV: no new surface (export is a client-side download of already-readable data; no writes).
## Data shape
None. A column is added to the downloaded file only.
## Security / RBAC
No write path, no Firebase calls. Fixes CSV injection. Button placement unchanged.
## Cost guardrails
No DB reads/writes added; history cap 500 untouched; no new deps.
## Concerns
The new `time` column shifts column positions for anyone parsing the old CSV; accepted per the issue.
