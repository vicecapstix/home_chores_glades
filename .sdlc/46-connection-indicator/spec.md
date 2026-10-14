# Spec — #46 Offline / connection indicator
Behaviour: `.info/connected` listener (Firebase built-in, free, no stored data) drives the header live dot (green pulsing when connected, amber static when not, title "Offline") and an "Offline — changes will sync" banner (`#offline-banner`, modal-style `.hidden` pattern, `role=status`). Every successful state snapshot updates "Last synced hh:mm" (`#tv-synced`), shown in the readonly/TV view.
UI states: admin & member — dot + banner; readonly TV — dot + banner + last-synced text (hidden in normal view).
Data shape: none; no writes; one extra listener on `.info/connected` (no download cost).
RBAC: none (read-only listener). Cost: none. Concern: Firebase reports connected=false until first connect, so the banner may flash briefly on load — banner is only shown after a first connected=true then a drop, or after 4s of never connecting.
