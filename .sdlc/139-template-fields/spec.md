# Spec #139
- Save: templateTask() stores category (must be in CATEGORIES), notes (<=300), dueTime (valid HH:MM) and subtask names (max 20 x 100 chars) per chore; empty fields omitted. No assignee/points/done/history.
- Apply: restores them; subtasks undone with fresh ids; freq 'once' gets dueDate = today; legacy templates (no new fields) apply with category '', notes '', no dueTime.
- Validation on apply guards against bad stored values (unknown category, invalid time).
- UI: admin only (existing guards). Template list renders names via esc() (unchanged).
- Data: templates/<id>/tasks[] gains optional fields; caps MAX_TEMPLATES 20 / MAX_TEMPLATE_TASKS 100 unchanged. Cost: slightly larger template docs only.
- Concern: applyTemplate still uses patchPaths (already multi-path), not writeState.
