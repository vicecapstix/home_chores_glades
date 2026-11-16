# Spec — #353

**Behaviour:** new `src/datasize.js`. `stateSize(state)` = UTF-8 bytes of `JSON.stringify` of the database-backed keys (members without `pinHash`, tasks, history, nextId, templates, rewards, redemptions, claims, swaps, pause, teamGoal, doublePoints, pocketMoney; local-only keys like `uid`, `admins`, `parentEmail` excluded) plus counts. `monthlyDownloadBytes = size x 5 devices x 10 opens/day x 30 days`. The panel text states those assumptions. Amber note (`.lb-note` with `role="note"`, warn colour) when size > 1 MB (1,048,576 bytes).

**UI states:** Admin Panel gets a "Data size" button opening `#datasize-modal` (same modal pattern as Fairness). Member: Admin Panel unreachable and `openDataSize` returns without opening. Readonly TV: no admin panel; `openDataSize` returns immediately.

**Data shape:** none; nothing is written or stored. **Security/RBAC:** `openDataSize` starts with `if (READONLY || !isAdminFn()) return;`; PIN hashes are excluded before measuring and never rendered. All text via `esc()`/numbers only. **Cost:** zero reads/writes; computed from `state` already in memory. **Concerns:** the size is an estimate of JSON, not of Firebase's own accounting.
