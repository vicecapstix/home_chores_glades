# Spec — #246 Done chore can be claimed, letting a sibling undo someone else's points

## Behaviour
- `cardHTML`: the Claim button is rendered only for an unassigned chore that is not done.
- `claimTask`: refuses a done chore (toast "Already done", no write, no local mutation).
- `ownershipBlock`: for non-admins, a done chore with a recorded `lastDoneBy` can be unchecked only by that member, whatever `person` is now. Assigned-to-someone-else block is unchanged.
- Admin can still uncheck anything; completer can still uncheck their own.

## UI states
- Admin / member: done Anyone card shows no Claim button. Readonly TV: unchanged (already no handlers).

## Data shape
None. No `/state` change.

## Security / RBAC
Closes a points-theft path (member undoing another's completion). Guards stay after `READONLY`; `isAdminFn` still passed in.

## Cost guardrails
No new reads/writes, no dependencies, no services.

## Concerns
Admin reassigning a done chore is covered by the `lastDoneBy` check (new assignee cannot undo the old completer's points).
