# Plan — #85
Files: `src/utils.js` (AVATARS, avatarPrefix; utils stays import-free), `src/members.js` (setAvatar), `src/main.js` (window.setAvatar + picker in admin panel), `src/render.js`, `src/ui.js`, `src/tv.js` (display), `tests/avatars.test.js`.
Steps: tests; implement; `npm run build:pages`.
Rollback: revert PR; `avatar` field ignored by older code.
