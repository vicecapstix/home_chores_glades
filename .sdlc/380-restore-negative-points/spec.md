# Spec: restore keeps negative points (#380)
**Behaviour:** `validateBackup` reads member `points` with a signed finite-number helper (non-numeric, empty or null -> 0). `weekPoints`, `streak`, `completedCount` still clamp to >= 0.
**UI states:** admin restore preview/confirm unchanged; member and readonly TV views unaffected (restore is admin-only, guards untouched).
**Data shape:** none changed; a restored member may now carry `points < 0`, which the live app already allows (admin deduction/uncheck with `allowNegative`).
**Security/RBAC:** no new entry point; restore guards (`READONLY || !isAdminFn()`) unchanged; PIN hashes still not restored.
**Cost guardrails:** none touched.
**Flagged concerns:** touches `src/restore.js` (always-JT list c). Open question for JT: is restoring a negative balance acceptable (default: yes, it reproduces the backed-up state).
