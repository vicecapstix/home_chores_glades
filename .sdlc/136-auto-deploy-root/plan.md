# Plan: #136

## Files
- `.github/workflows/deploy-root.yml` (new)
- `.github/workflows/ci.yml` (remove drift step)
- `tests/ci.test.js` (drift-check test replaced by the new flow), `tests/deploy-workflow.test.js` (new, committed first)
- `CLAUDE.md`, `README.md` (describe the new flow)
- Root deployed files: unchanged (no `src/` change)

## Steps
1. Failing tests (done, committed first).
2. Add deploy workflow; trim ci.yml.
3. Update the old ci.test.js drift test and docs.
4. `npm test`, `npm run build`.

## Test plan
Text-level assertions on the workflow files (trigger, permissions, loop guard, concurrency, no secrets), docs mention. Real behaviour is proven on the first merge to `main` (see PR).

## Rollback
Delete `deploy-root.yml` and restore the drift step in `ci.yml` (revert this PR). Option B (PRs commit the bundle) works again unchanged.
