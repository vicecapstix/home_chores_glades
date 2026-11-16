# Spec — #354

**Behaviour:** a text input (`#chore-search-input`) sits above the filter pills. Typing sets a module-level query in `render.js`; `_renderTasks` keeps only chores whose name or notes contain the trimmed, lower-cased query (`matchesSearch`), applied AND-wise with the status and category filters, before the Off / done-one-off sections are split, so those sections are searched too. An x button (shown only when text is present) and Esc clear it and refocus the input. No match with a query active shows "No chores match". The query is cleared when a different member takes over the device (`syncViewToMember`).

**UI states:** Admin and member: input shown. Readonly TV: the whole search row is hidden by CSS and `_renderTasks` ignores any query. The input is not part of the re-rendered `#filters`, so typing keeps focus across live snapshots.

**Data shape:** none; nothing stored. **Security/RBAC:** no write path. The query is only compared as text, never injected into HTML (the empty message is static). **Cost:** none. **Concerns:** none.
