# Spec — #396 CLAUDE.md member shape lists `spent`
## Behaviour
Docs only: the "Member data shape" block in CLAUDE.md gains `spent` (net points spent on rewards, written by the spend-points transaction in `src/firebase.js`, read by `src/pocketmoney.js`). Other member fields re-checked against `src/` writes: no other drift found.
## UI states
None (no app change). Admin/member/readonly TV unaffected.
## Data shape
None changed; documentation only.
## Security / RBAC
None. No code touched.
## Cost guardrails
None affected.
## Flagged concerns
CLAUDE.md is edited, but only the data-shape docs, not the build/deploy flow.
