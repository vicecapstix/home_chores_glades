# Spec: auto-rebuild root deploy files after merge (#136)

JT chose option A on 26 Oct.

## Behaviour
- New workflow `.github/workflows/deploy-root.yml`, trigger `push` to `main` only (never `pull_request`, so it cannot run for fork PRs).
- Steps: checkout latest `main`, `npm ci`, `npm run build:pages`, and if any root deployed file changed, commit as `github-actions[bot]` with `[skip ci]` and push to `main`. Finally verify root files equal `dist/`.
- No loop: job `if: github.actor != 'github-actions[bot]'`, `[skip ci]` in the message, and pushes made with `GITHUB_TOKEN` do not trigger workflows anyway. A no-change build commits nothing.
- Serialised with `concurrency` (`cancel-in-progress: false`) and checkout of `main`'s tip, so two quick merges do not race.
- `ci.yml` keeps tests + build on PRs and main, but drops the "root files are stale" failure. PRs no longer need to commit `index.html`, `sw.js`, etc. (a PR that still does is harmless).

## UI states
No app change. Admin, member and TV view are unaffected; the live site updates a minute or so after a merge.

## Data shape / RBAC
None. No /state changes, no new write paths in the app.

## Security notes
- Workflow has `permissions: contents: write` (this workflow only; `ci.yml` stays `contents: read`).
- It builds and pushes code that is already on `main`, so it adds no new trust. Uses only `GITHUB_TOKEN`, no secrets.
- If `main` gets branch protection that blocks bot pushes, the commit step fails visibly; see rollback.

## Cost guardrail check
Free standard ubuntu runners on a public repo, GitHub Pages `main` / root unchanged. No new services, keys or deps.

## Flagged concerns
- Merge -> deploy now takes ~1-2 minutes (the bot commit), and the live site is briefly the previous build.
- `main` will contain bot commits; `git pull` before pushing branches.
- Requires Settings -> Actions -> General -> Workflow permissions to allow the workflow to write (the `permissions:` block normally suffices for a public repo; if the first run fails with 403, set "Read and write permissions").
