# Spec #138
- bulkAssign (admin only) sets `person` on selected chores and writes one multi-path update (`patchPaths`) with only `tasks/<id>/person` and, when dropped, `tasks/<id>/rotation: null`.
- If a chore has a rotation and the new person is "Anyone" or not in it, the rotation is removed; toast "Rotation turned off for N chore(s)". If the person is in the rotation it is kept (rotation continues from them).
- UI: admin sees the bulk bar (unchanged). Members and the readonly TV view never see/run it (`READONLY || !isAdmin()` guard kept).
- Data shape: no new fields; `rotation` may be deleted (null).
- Security: no rules change; guard unchanged. Cost: fewer bytes written than full writeState. No new services.
- Concern: a rotation with <2 valid names is inert anyway; we use raw name membership.
