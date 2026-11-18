# Spec #357 Reward stock
- Behaviour: reward has optional `stock` (whole 1-99). Blank = unlimited (field absent, old rewards unaffected). Request reserves one via transaction on `state/rewards/<id>/stock` (first, before points spend); sold out -> "Sold out", nothing spent. Approve keeps the reservation (net -1). Deny, undo of the request, and a failed request return one (capped 99).
- UI: admin form gets a Stock input (prefilled on edit). Card shows "N left" / "Sold out"; Request disabled and labelled "Sold out" at 0. Same markup on the TV rewards panel (read-only: shows N left, no buttons).
- Data: one optional number field on rewards; no reshape. Bounded 1-99.
- Security/RBAC: edits in saveReward guarded by READONLY + isAdminFn (existing). Stock writes use transactions; helpers no-op when READONLY. Rules unchanged.
- Cost: Spark only, no deps/services. One tiny extra transaction per request/deny.
- Concerns: restore.js copies unknown reward fields via clone so `stock` likely survives but is not validated there (follow-up). Admin Edit overwrites stock with the form value (intended: set available count).
