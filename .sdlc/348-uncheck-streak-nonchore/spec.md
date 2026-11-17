# Spec: uncheck keeps inflated streak (#348)

**Behaviour:** `undoCompletionRecords` (src/tasks.js) decides whether another same-day completion by the member still justifies today's streak. It must count only real completions (history entries without `type`), not `swap` or `bonus` rows (bonus covers admin ± Points and approved claims).

**UI states:** no UI change. Admin, member and readonly TV just show the corrected streak. Readonly never writes (toggleTask returns early).

**Data shape:** none. Same `patchMember` write as before.

**Security/RBAC:** no change; ownershipBlock and READONLY guards untouched.

**Cost guardrails:** no new reads/writes, no services or dependencies.

**Concerns:** none.
