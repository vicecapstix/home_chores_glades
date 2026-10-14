# Spec — #27 Missing admin guards on write paths
Behaviour: bulkAssign, bulkDelete, drag-drop reorder, addSubtask, removeSubtask start with `if (READONLY || !isAdminFn()) return;` (isAdminFn passed from main.js, no circular import). claimTask no-ops with toast if the task already has a person. toggleRole refuses to demote the last admin (toast). removeMember asks for confirm(). toggleSubtask stays member-allowed.
UI states: admin — unchanged. Member — Select button, subtask delete and subtask add row hidden (CSS `body[data-role="member"]`), cards not draggable. Readonly TV — already hidden / data-role=member.
Data shape: none. RBAC: client-side only (server enforcement needs rules, see #41 needs-jt). PIN code untouched.
Cost: none. Concern: existing unit tests for removeMember needed a confirm() stub.
