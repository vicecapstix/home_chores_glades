# Spec — #42 Set PIN guard

## Behaviour
- `setPinKey` returns immediately unless `!READONLY && isAdmin()`.
- When the 4th digit is entered, the target name is captured first. If it is empty or not an existing member (`state.members[name]`), nothing is written; the modal shows "Member not found" and clears the buffer.
- On success the toast uses the captured name ("PIN saved for Alice"), not the cleared module variable.

## UI states
- Admin: unchanged happy path, toast now names the member.
- Member / readonly TV: Set PIN cannot be opened (existing window guard) and now keypresses cannot write either.

## Data shape
No change. Prevents creation of a bogus `state/members/pinHash` node.

## Security / RBAC
Adds the missing defence-in-depth guard. Hashing (SHA-256), stored PINs, rules and auth config are untouched (issue approved code-only).

## Cost guardrails
No new service/dependency, fewer stray writes. Tests mock Firebase.

## Flagged concerns
Enforcement is still client-side because DB rules are open (out of scope).
