# Spec — #219
**Behaviour (READONLY only, `?readonly=1`):** in `cardHTML` (src/render.js)
- an unassigned, not-done, not-select-mode card shows the plain `Anyone` tag (`tag tag-freq`) instead of the Claim button;
- the done tick renders as a non-interactive `<span class="check" role="img" aria-label="…done/not done">` — no `onclick`, not focusable (no `<button>`).

**UI states:** admin / member (normal mode) — unchanged. TV / readonly — as above. Select mode is unreachable in READONLY.
**Data:** none. No /state change, no new writes.
**Security/RBAC:** removes interactive controls only; `toggleTask`/`claimTask` keep their own READONLY guards (defence in depth).
**Cost guardrails:** no services, no DB reads/writes added.
**Concerns:** none. `.check` CSS is class-based so the span keeps its look.
