# Spec — #25 Make the build-drift CI check required

## Behaviour
- CI step "Check deployed files are up to date" fails the job when root files differ from a fresh build.
- Compared files: `index.html`, `sw.js`, `manifest.webmanifest`, `icon.svg`, `icon-192.png`, `icon-512.png` (dist/ vs root).
- `build:pages` already copies all of these (`postbuild:pages` hook, #45); no script change needed, tests lock it in.
- CLAUDE.md: every PR that changes `src/` runs `npm run build:pages` and commits the root files.

## UI states
No app/UI change. Admin / member / readonly TV view are unaffected.

## Data shape (/state)
None.

## Security / RBAC
No app write paths touched. Workflow keeps `permissions: contents: read`, no secrets.

## Cost guardrails
Free `ubuntu-latest` runner only; no new services, deps or Pages deploy action. Firebase untouched.

## Flagged concerns
- To make the check *merge-blocking* JT must add it as a required status check in branch protection (repo settings; not done by this PR). Without it the job turns red but GitHub still allows merge.
- Vite output is assumed deterministic between local and CI Node 20; if hashes differ the check will false-fail (tests/build verified locally).
