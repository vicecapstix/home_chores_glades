# Spec — #37 modal history sync

Behaviour
- `openModal(id)` pushes one history entry (and one stack slot) per open; re-opening an already-open modal (e.g. admin panel re-render) only refreshes visibility, no extra entry.
- `closeModal(id)` (x button / backdrop click) removes the stack slot and calls `history.back()` once for its own entry, guarded by `history.state.fcModal`. The resulting popstate is ignored (counter) so it does not close a second modal.
- Browser Back (popstate not initiated by us) closes the top modal. This also fixes a latent bug: the old listener checked the destination entry's state, which is null for the last modal.
- `closeAllModals` closes all and uses one `history.go(-n)`.
- Admin panel uses `openModal('admin-panel-modal')` / `closeModal`; Back closes it.

UI states: admin only (panel already guarded by READONLY/isAdmin); member and read-only TV unchanged (never open it). Other modals benefit from fixed Back.

Data/security: no data shape, Firebase, auth or RBAC changes. Guards in openAdminPanel retained.

Cost guardrail: no Firebase reads/writes added; no services or deps.

Concerns: closing admin then immediately opening Set PIN leaves one stale forward history entry; harmless. Closing a non-top modal keeps the stack consistent.
