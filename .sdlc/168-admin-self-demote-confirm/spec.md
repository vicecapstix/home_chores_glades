# Spec #168
- Behaviour: Admin Panel Toggle awaits the role write, then re-renders the panel. Demoting yourself first asks "Demote yourself? You'll lose admin on this device."; Cancel writes nothing. If after the write the signed-in member is no longer admin, the panel closes with a toast. Last-admin protection is checked first and unchanged.
- UI: admin only (panel is admin-only). Members and READONLY TV unaffected.
- Data: same single `members/<name>/role` patch as before; no new fields.
- RBAC: `toggleRole` still starts with `READONLY || !isAdminFn()`; new optional `currentMemberFn` param (bound in main.js, no circular import).
- Cost guardrail: no extra reads/writes.
- Concern: when /admins (UID-based admins) exists, role changes do not change `isAdmin()`, so the panel stays open after a self-demote; the confirm text is still accurate for the legacy role-based mode this device uses.
