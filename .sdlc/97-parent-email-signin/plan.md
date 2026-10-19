# Plan — #97

## Files
src/config.js, src/firebase.js (parentSignIn/SignOut, error messages, watchAdmins, auth state), src/state.js (admins, auth), src/auth.js (adminsActive, parentMemberName, isAdmin, loginAs), src/parent.js (new UI), src/main.js (wiring), src/index.html, src/style.css, firebase-rules.json, README.md, RESET.md, tests/parent-signin.test.js, tests/rules/admins.test.js, root deploy files.

## Test plan
Unit: isAdmin with/without /admins, setup mode, sign-in success/failure, sign-out failure, error messages, wiring. Rules emulator: /admins readable signed-in only, never writable. Headless Chromium smoke test of the form (open, empty submit, missing key, back).

## Rollback
Revert the PR. After rollout: delete `/admins` in the Console to return to role-based admin.
