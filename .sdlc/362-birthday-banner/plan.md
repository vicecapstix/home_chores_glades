# Plan — #362
Files: new `src/birthday.js`; `src/render.js` (call), `src/main.js` (import, Admin Panel field, `window.setBirthday`), `src/index.html` (banner div), `src/style.css` (order + field width), `CLAUDE.md` (module list, member shape), tests `tests/birthday.test.js`, `tests/birthday-readonly.test.js`; root files via `npm run build:pages`.
Test plan: validation, banner on/off by date, 29 Feb, escaping, admin/non-admin/READONLY write guards, rename keeps it.
Rollback: revert the PR; stored `birthday` values are simply ignored.
