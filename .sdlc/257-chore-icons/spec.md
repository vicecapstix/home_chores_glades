# Spec #257 — chore icons
**Behaviour:** optional `icon` on a task, one of `CHORE_ICONS` (12 emoji, utils.js). Admin picks it in the Add form and the card editor. `iconPrefix(t)` returns "<emoji> " only for listed values, so DB junk is never rendered. Shown before the name on cards (which the TV view also uses) and in the This week planner. Kept by templates (save + apply), the chore-file download/upload and full backup (restore clones task objects unchanged, render still filters).
**UI states:** admin sees the select in add/edit; member and readonly TV see the emoji only.
**Data (/state):** additive optional `tasks/<id>/icon` (cleared with null on edit).
**Security/RBAC:** `addTask`/`saveTask` keep `READONLY || !isAdminFn()` guards; value validated against the fixed list on write and on render; output goes through `esc()`. `src/restore.js` is NOT changed.
**Cost:** one short string per chore; no new service.
**Concerns:** none. The starter list has no icons yet (makeTask supports them).
