# Spec — #183 History writes go through transactions

## Behaviour
- **Bonus award**: after the atomic points update, the history entry is appended with `appendHistory()` (a `runTransaction` on the live `state/history`), not by re-sending the whole local array.
- **Bonus undo** and **chore uncheck**: the entry is removed by new `removeHistoryEntry(match)` — a `runTransaction` that finds the entry on the LIVE array (newest first) by `completedAt` + `person` (+ `taskId` for chores, `type:'bonus'` for bonuses) and removes only that one. Entries other devices appended meanwhile survive.
- If the entry is no longer on the live array (already trimmed/removed), the transaction aborts without writing; undo still reverses points as before.
- Bonus entries gain `taskName: 'Bonus: <reason>'` so they satisfy the draft rule `history/$i hasChildren(['taskName','person'])`. History modal/CSV already render bonuses as "Bonus: <reason>" from `type`/`reason`, so display is unchanged.
- The 500 cap is a single constant `HISTORY_CAP` (config.js), used by `appendHistory`.

## UI states
No visible change for admin, member or readonly TV view. Writes stay guarded by `READONLY` / `isAdmin()` (bonus) and existing ownership rules (uncheck); the new helper also returns early when `READONLY`.

## Data shape (/state)
`history[]` entries: bonus entries add `taskName`. No new paths, same cap (500).

## Security / RBAC
No rule or auth changes. `removeHistoryEntry` is only called from already-guarded paths. Draft `firebase-rules.json` untouched (a rules-emulator test is added for a bonus-shaped entry).

## Cost guardrails
Free Spark RTDB only. Fewer bytes are sent (one entry instead of up to 500 per write). No new services/deps.

## Flagged concerns
- `runTransaction` aborts (returns undefined) when the entry is not found; if the SDK's first guess is `null` we return `null` so it retries against the server value.
- Old bonus entries without `taskName` remain valid for display.
