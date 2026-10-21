# Plan — #96
## Files
`package.json` (+scripts/devDeps), `package-lock.json`, `firebase.json` (emulator + rules path only), `vitest.rules.config.js`, `rules-tests/state.rules-test.js`, `.github/workflows/ci.yml`, `.gitignore`, `README.md` (short note).
## Steps
1. Commit failing tests first (no harness). 2. Add config, script, `firebase.json`. 3. Add CI job. 4. Run `npm run test:rules`, `npm test`, `npm run build`, drift check.
## Test plan
8 emulator tests (see test file); existing 528 Vitest tests unchanged.
## Rollback
Revert the PR; nothing deployed or stored, no live-DB or rules changes.
