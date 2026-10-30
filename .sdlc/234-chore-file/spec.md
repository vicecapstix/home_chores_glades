# Spec: download and upload the chore list as a file (#234)

## Behaviour
- **Download chores** (Admin Panel): saves `familyflow-chores-YYYY-MM-DD.json` built from local state only (no Firebase read/write). Shape: `{ kind: "familyflow-chores", schemaVersion: 1, exportedAt, chores: [...] }`. Each chore carries only definition fields: `name, freq, difficulty, category, notes`, plus `days` (weekdays), `intervalDays` (interval), `dueDate` (one-off), `dueTime` (when set) and `subtasks` (array of names). No ids, assignees, done state, `lastDone`, points, history or members.
- **Upload chores** (Admin Panel): pick a `.json` file (<= 200 KB). `validateChoreFile` is pure:
  - file must be `kind: "familyflow-chores"`, `chores` an array of at most 200;
  - per chore: name 1-100 chars, freq in the known list, difficulty `easy|medium|hard` (missing = easy), category in `CATEGORIES` (anything else is cleared), notes <= 300, `days` (0-6, at least one) for weekdays, `intervalDays` 2-60 for interval, `dueDate` `YYYY-MM-DD` for one-off, `dueTime` `HH:MM`, at most 20 subtask names of 1-60 chars;
  - invalid chores are listed with a reason and skipped; chores whose name (case-insensitive) already exists, or repeats in the file, count as "already exist" and are skipped.
- A preview modal says "N new, M already exist (skipped)" (+ invalid list) with **Add** and **Cancel**. Add writes the new chores as "Anyone" (`person: ''`), not done, in **one `patchPaths`** update together with `nextId`. Nothing is deleted or overwritten: every path is a new `tasks/<id>`.
- Chore objects are built by `makeTask` in `starter.js` (the #233 helper, now also used by the file upload), so uploaded chores start with the same `lastDone` rule as chores added from the list.

## UI states
- Admin: two new buttons in the Admin Panel, a preview modal (standard `.hidden` modal pattern).
- Member: the Admin Panel is not offered; handlers also refuse (`isAdminFn`).
- Read-only TV (`?readonly=1`): no admin UI; functions return early on `READONLY`.

## Data shape changes in /state
New `tasks/<id>` entries and `nextId` only; same shape as an added chore (`id, name, freq, person '', done false, lastDone, notes, difficulty, category, dueDate, subtasks, order` and optionally `days, intervalDays, dueTime`).

## Security / RBAC
Admin-only (`READONLY || !isAdminFn()` guards on download, prepare and confirm). File is read in the browser only, size-checked before reading and validated field by field; unknown fields are dropped, so a crafted file cannot inject `person`, `done`, points or ids. Every name/reason shown in the preview goes through `esc()`. No Firebase rules/auth/PIN changes.

## Cost guardrails
Browser-only file handling (no Storage). One small write of at most 200 chores (about 60 KB), duplicates skipped. No new services, secrets, dependencies or CI changes.

## Flagged concerns
Repeated uploads with different names can add up to 200 chores each; there is no overall chore cap in the app today (not introduced here).
