# Spec #164
- Behaviour: on every snapshot after the first, if sessionStorage fc_member is not in state.members, clear it, show the member picker (pin-screen) and toast 'Your name changed — pick it again'. Setup mode (no members) just clears silently.
- Same-device rename: renameMember now sets sessionStorage BEFORE the write, because the local RTDB snapshot can fire before the await resolves; reverted on failure.
- UI: admin/member see picker; READONLY/TV unaffected (guard).
- Data: none. RBAC: client session only; no PIN/auth change; picker still requires PIN.
- Cost: no reads/writes. Concern: a member with an unrelated PIN reuses normal login flow.
