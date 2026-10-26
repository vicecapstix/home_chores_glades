# Spec #172
- Behaviour: status filter (Mine/All/Pending/Overdue/Done) and category filter combine with AND. setFilter no longer clears the category; setCatFilter no longer resets status to All. Tapping the active category clears only the category.
- Counts: status pill counts are computed within the active category; category pills now show a count computed within the active status.
- UI: admin and member; READONLY TV unaffected (no filters shown).
- Data: none. RBAC: no writes.
- Cost guardrail: client-side only.
- Concern: a category with zero matches under the status shows count 0 and an empty list ("Nothing here"); tap the category again to clear.
