# Spec #358: estimated minutes per chore

## Behaviour
- New optional task field `minutes`: whole number 1-180. `validMinutes()` in src/utils.js (mirrors `validPoints`); invalid values are ignored on read and write.
- Add form: "Min" input next to Pts. Edit card: `.edit-minutes`. Blank or invalid removes the field (patch path set to null).
- Card: "~N min" tag (the TV renders the same cards).
- This week: each chore row shows "~N min"; each day shows total minutes per person (Anyone included), only when at least one chore has an estimate.
- Templates (`templateTask`, `applyTemplate`) and chore file (build, validate, addPayload via starter.js makeTask) keep `minutes`.
- Points are unchanged.

## UI states
- Admin: sees and edits the field. Member: sees tag and totals only. Read-only TV: sees tag, no inputs.

## /state data shape
Additive optional `tasks/<id>/minutes` (integer). No new top-level path. Bounded by the 1-180 range; no history or cap changes.

## Security / RBAC
Writes only via addTask/saveTask, which already start with READONLY / isAdminFn guards. Values rendered through esc() and a numeric validator. No rules/auth/PIN change. src/restore.js untouched: it clones task objects, so `minutes` survives a restore and is validated on read.

## Cost guardrail check
No new services, keys or dependencies; one small integer per chore on Spark.

## Concerns
Per-person totals count only chores with an estimate; weekly/monthly chores count on their due day only.
