# Spec — #96 Rules test harness (emulator)

## Behaviour
- `npm run test:rules` starts the local Firebase Realtime Database emulator (project `demo-familyflow`), runs `rules-tests/*.rules-test.js` with `@firebase/rules-unit-testing` against `firebase-rules.json`, then shuts the emulator down.
- `npm test` is unchanged (rules tests use a different filename suffix and config, so Vitest's default run ignores them; no Java needed).
- New CI job `rules-tests` (free `ubuntu-latest`, `setup-java` + emulator).

## UI states
None. No `src/` change, so admin / member / read-only TV views are unaffected; the deployed root files are unchanged.

## Data shape
No change to `/state`.

## Security / RBAC
Tests only assert the current draft rules: unauthenticated read/write denied, authenticated read allowed, nothing outside `/state`, `nextId` validate, member role enum, history index cap (0..499). No rules are changed or deployed.

## Cost guardrails
Dev dependencies only (`firebase-tools`, `@firebase/rules-unit-testing@^3`, both free, approved by JT 19 Oct). No `.firebaserc`, no `firebase login`/`deploy`, demo project id means no production calls. Free standard runner on a public repo.

## Flagged concerns
- `@firebase/rules-unit-testing` v5 needs `firebase@12`; the app uses `firebase@^10`, so v3 (peer `firebase@^10`) is pinned.
- `firebase-tools` is large and adds many lockfile lines (lockfile excluded from the size target); `npm audit` reports advisories in its dev-only tree.
- The first CI run downloads the emulator jar from Google at job time; if that is blocked the job fails (not the `test-build` job).
- In proxied sandboxes the emulator CLI needs HTTP(S)_PROXY unset to reach its own localhost.
