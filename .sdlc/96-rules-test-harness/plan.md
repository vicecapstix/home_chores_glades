# Plan — #96

## Files
package.json (+ lock), firebase.json, vitest.rules.config.js, vitest.config.js (exclude), tests/rules/helpers.js, tests/rules/state.test.js, tests/ci.test.js, .github/workflows/ci.yml, .gitignore, README.md.

## Test plan
`npm run test:rules` locally (15 pass); mutation check: setting `/state/.read` to `true` makes the unauthenticated-read test fail. `npm test` and `npm run build` unchanged.

## Rollback
Revert the PR. Nothing live is touched.
