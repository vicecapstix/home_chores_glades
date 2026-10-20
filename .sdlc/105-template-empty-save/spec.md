# Spec — #105 Templates: refuse empty save, tolerate missing tasks, cap sizes

## Behaviour
- `saveTemplate`: refuses (toast "Add some chores before saving a template") when there are no chores; refuses when 20 templates already exist ("Template limit reached (20)"); refuses when chores > 100 ("Too many chores for one template (max 100)"). Name empty check unchanged.
- `renderTemplates` / `applyTemplate`: `tpl.tasks` missing (Firebase drops empty arrays) is treated as `[]`. Old broken templates show "0 tasks" and can be deleted.
- Writes: `saveTemplate` and `deleteTemplate` write only `templates/<id>` via `patchPaths` (multi-path update on /state), no longer a full `writeState()`. A failed write toasts the error.

## UI states
- Admin: Templates modal works; save/apply/delete as above.
- Member: unchanged — functions return early (`isAdmin()` guard).
- Read-only/TV: unchanged — `READONLY` guard, no write controls.

## Data shape
`/state/templates/<id>: { id, name, tasks: [{name,freq,difficulty,days?}] }` — unchanged shape; now always has >=1 task and <=100 tasks; <=20 templates.

## Security / RBAC
Guards `READONLY` and `isAdmin()` retained on all three functions. Names stay escaped with `esc()`/`jsq()`. No rules/auth/PIN changes.

## Cost guardrails
Reduces write size (granular path) and bounds /state growth. No new services, deps or secrets. Spark plan unaffected.

## Flagged concerns
Existing legacy empty templates remain in the DB until an admin deletes them (no data migration performed — we never write to live DB).
