# Plan: Parent cheer (#403)
Files: src/firebase.js (cheerHistoryEntry), src/cheer.js (new: click handler, banner), src/history.js (button/mark, initHistory), src/render.js (banner call), src/main.js (window.cheerClick/hideCheer, initHistory), src/index.html, src/style.css, CLAUDE.md, tests/cheer.test.js, root deployed index.html.
Steps: helper -> UI in History -> handlers -> banner -> tests -> build:pages.
Tests: admin writes one field; array untouched; once per entry; stale entry aborts; non-admin/READONLY blocked; write failure toast; button visibility; escaping; banner once/only for target/TV hidden.
Rollback: revert the PR; stray `cheer` fields on history entries are ignored by older code.
