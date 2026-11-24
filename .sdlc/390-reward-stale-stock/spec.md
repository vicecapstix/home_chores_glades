# Spec: reward edit must not write back stale stock (#390)

## Behaviour
- `editReward` remembers the stock shown (`editingStock`, null = unlimited).
- Editing an existing reward writes leaf paths (`rewards/<id>/name|cost|icon|perWeek`), no longer the whole reward object. Cleared optional fields (`perWeek`) are written as null.
- `rewards/<id>/stock` is written only when the typed stock differs from the value shown at Edit time. A change is applied relative to the live value: `live + (typed - shown)`, clamped 0..99. Switching to or from unlimited (blank) is written as typed.
- New rewards are unchanged (whole object, `MAX_REWARDS` cap, same validation).

## UI states
Admin only (Rewards modal). Member and readonly TV views have no edit path; `saveReward` already starts with `if (READONLY || !isAdminFn()) return;`.

## Data shape
No new fields. `/state/rewards/<id>/stock` semantics unchanged (absent = unlimited, 0-99).

## Security / RBAC
Guards unchanged. No rules/auth/PIN/CI/deps change; `src/restore.js` untouched.

## Cost guardrail check
Smaller writes than before; no new reads or services.

## Flagged concerns
The live value comes from the listener copy in `state.rewards`; a reservation made in the last moments before Save can still race (a sub-second window, no worse than before and much narrower than the form-open window).
