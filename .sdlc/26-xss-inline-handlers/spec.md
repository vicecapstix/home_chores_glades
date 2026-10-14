# Spec — #26 Apostrophe names break login; stored XSS via inline handlers
Behaviour: user/DB data is never interpolated raw into inline JS or HTML attributes. New `jsq()` in utils.js encodes every non [A-Za-z0-9 _-] char as a `\uXXXX` escape, so the value is safe inside a single-quoted JS string inside a double-quoted HTML attribute (decodes to the original string at runtime, e.g. `O'Brien` logs in correctly). Applied to member, category, task, subtask and template handler args. DB-sourced values written into HTML attributes/class/text (`t.id`, `st.id`, `t.freq`, `t.difficulty`) go through `esc()`.
UI states: identical for admin/member/readonly TV; no visible change except names with quotes now work.
Data shape: none. RBAC: none added (guards untouched). Cost: none.
Flagged: DB is still world-writable (needs-jt rules issue #41); this removes the client-side XSS only. Root index.html not regenerated (see PR #60).
