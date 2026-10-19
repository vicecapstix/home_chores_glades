# Spec — #96 Rules test harness

## Behaviour
- `npm run test:rules` starts the local RTDB emulator (`firebase emulators:exec --only database --project demo-familyflow`) and runs `tests/rules/**` with `vitest.rules.config.js` (node env, serial).
- Tests load `firebase-rules.json` (the #41 draft) directly via `@firebase/rules-unit-testing`; `firebase.json` points the emulator at the same file.
- First suite: unauthenticated read/write denied, signed-in read allowed, writes outside `/state` denied, `nextId` validate (missing, non-number, delete), a few shape checks (freq, role, history cap 500).
- `npm test` excludes `tests/rules/**`, so it stays fast and needs no Java.
- New CI job `rules` (ubuntu-latest, setup-java 21, emulator jar cached).

## Data shape
None. No app code changes, no deploy-file changes.

## Security
Emulator only, `demo-` project: no network to production. No `.firebaserc`, no `firebase login`, no deploy, no secrets (tested in `tests/ci.test.js`).

## Cost guardrails
Dev-only dependencies (approved by JT 19 Oct). Free GitHub runner.
