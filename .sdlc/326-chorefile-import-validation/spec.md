# Spec: Chore file import validation

**Behaviour:** checkChore stores validInterval(c.intervalDays) (a number) and requires dueDate to round-trip through parseLocalDate/localDateStr. Invalid chores are listed as skipped with reason "Due date must be a real date (YYYY-MM-DD)".

**UI:** admin upload summary only; member and readonly TV view unaffected. No new UI.

**/state shape:** none changed. intervalDays is now always a number (matches firebase-rules.json isNumber()).

**Security/RBAC:** upload remains READONLY + admin guarded (unchanged). Input is stricter, nothing looser. esc() on summary unchanged.

**Cost guardrails:** no new reads/writes/services/deps.

**Concerns:** none.
