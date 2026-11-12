# Spec #333 — submitClaim in-flight guard
Behaviour: a module-level `submitting` flag makes a second `submitClaim` return false while the first write is pending; released in `finally` (success and failure).
UI: member's Send button behaves the same; second tap is ignored. Admin/readonly TV: unchanged (READONLY returns first).
Data: none changed; still one `claims/<id>` entry per send, cap of 20 per member unchanged.
Security/RBAC: existing READONLY and member checks unchanged. No rules/auth/PIN change.
Cost: fewer duplicate writes. Concerns: none (same pattern as `deciding` here and `busy` in redemptions.js).
