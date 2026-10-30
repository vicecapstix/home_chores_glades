# Spec — #218 Double-tap leaves a phantom history entry

## Behaviour
`toggleTask(id, …)` keeps an in-memory `Set` of task ids being toggled. A call for an id already in the set returns immediately (no toast, no write). The id is removed in a `finally`, so success and errors both release it. Other task ids are unaffected.

## UI states
Admin/member: second tap during the first write is a no-op. Readonly TV: `READONLY` return happens first; no handlers.

## Data shape
None.

## Security / RBAC
Guard sits after `READONLY` and does not bypass `ownershipBlock`. Not a security change.

## Cost guardrails
Fewer duplicate writes; no new deps/services.

## Concerns
Guard is per-tab memory only; two devices tapping at once is out of scope (#218 covers one phone).
