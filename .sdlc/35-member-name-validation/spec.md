# Spec — #35

## Behaviour
`addMember` calls `validateMemberName(name)` (exported from `src/members.js`). Invalid names show a toast ("Names can't contain . # $ [ ] /" or "Name must be 1–30 characters") and write nothing; the input keeps its text so the admin can fix it. Empty/whitespace-only input stays a silent no-op as before. Duplicates stay a silent no-op.

## UI states
Admin: toast on invalid. Member / readonly TV: add-member is admin-only (guard unchanged).

## Data shape
None. Existing members are untouched (no migration).

## Security / RBAC
Guard `READONLY || !isAdminFn()` unchanged. Validation also prevents key injection into nested DB paths (e.g. `a/b`). Rules/PINs untouched.

## Cost guardrails
No new reads/writes/deps. Pass.

## Concerns
Existing members with bad names (if any) are not renamed; renaming is #56.
