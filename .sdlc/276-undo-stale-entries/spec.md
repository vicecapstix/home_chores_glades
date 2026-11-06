# Spec — #276
**Behaviour (`src/undo.js`):**
- `popUndo` undoes only the newest entry and then clears the rest of the stack (their 5 s window is over once the toast is dismissed).
- When the toast hides (Undo clicked or 5 s expiry) the `#undo-btn` is `disabled` so it can't be focused or activated; showing the toast re-enables it. The initial markup in `src/index.html` has the button `disabled`.
- Two quick deletes + Undo inside the window still restores the latest one (LIFO unchanged).

**UI states:** admin only (only admins delete). Member / TV: toast never shown; button stays disabled.
**Data:** none. No /state change.
**Security/RBAC:** none added; undo closures already carry their own guards.
**Cost guardrails:** none touched.
**Concerns:** an undo that fails still drops older entries (acceptable: window is closed).
