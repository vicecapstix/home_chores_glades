# Spec — #395 Data size readout counts bonusChore

## Behaviour
`stateSize()` in `src/datasize.js` adds `bonusChore` (state/bonusChore, #360) to `DB_KEYS`, so the byte total includes it. Nothing else changes.
## UI states
Admin: readout total is slightly larger when a bonus chore is set. Member and read-only TV: unchanged (modal is admin-only; `openDataSize` keeps its READONLY/admin guard).
## Data shape
None. Read-only measurement of in-memory state.
## Security / RBAC
No new write path, no new HTML.
## Cost guardrails
No services, deps or Firebase reads/writes.
## Flagged concerns
None.
