# Plan: parent sign-in (#97)

## Files
- `src/state.js`: add `admins: null`, `uid: null`.
- `src/firebase.js`: `parentSignIn`, `parentSignOut`, `watchAdmins`, uid tracking + auth-change hook in `initAuth`.
- `src/auth.js`: new `isAdmin` logic, `completeParentLogin`.
- `src/main.js`, `src/index.html`, `src/style.css`: parent modal, handlers, admins listener, Admin Panel button.
- `firebase-rules.json`: `/admins` read-auth, write false. README: Console steps.
- Tests: `tests/parent-signin.test.js`, rules emulator test, static rules test.

## Steps
1. Docs commit. 2. State/firebase/auth logic + tests. 3. UI. 4. Rules + README + rules tests. 5. build:pages.

## Test plan
isAdmin with/without `/admins` (and non-listed role=admin), sign-in error mapping, READONLY guard, sign-out; rules: `/admins` readable when authed, not writable (authed or anon).

## Rollback
Revert the PR. Without `/admins` in the DB behaviour is identical to before, so merging first is safe.
