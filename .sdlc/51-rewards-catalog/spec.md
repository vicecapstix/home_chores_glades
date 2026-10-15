# Spec — #51 Rewards catalog

## Behaviour
- New header button 🎁 opens a **Rewards** modal listing the catalog sorted by cost then name: icon, name, cost in points.
- Admin only: an add/edit form (name ≤40 chars, cost integer 1–999, icon optional, default 🎁), Edit and Delete per reward. Max 50 rewards; the 51st add is refused with a toast.
- Edit loads a reward into the form; Save overwrites that reward id, Cancel clears it. Delete asks `confirm()`.

## UI states
- Admin: list + form + Edit/Delete.
- Member: list only (form and buttons hidden by `body[data-role="member"]` CSS *and* never acted on, because every write function checks `isAdmin`).
- Readonly TV (`?readonly=1`): list only; all write functions return on `READONLY`.
- Empty catalog: "No rewards yet." (admins also see a hint to add one).

## Data shape (/state)
`rewards: { "r<timestamp>": { id, name, cost, icon } }`, max 50 entries (~5 KB worst case).
`writeState()` now carries `rewards` through (it rebuilds the whole node, so omitting it would wipe the catalog on any full write). Writes from this feature are path updates: `rewards/<id>` set or `null`.

## Security / RBAC
All CRUD starts with `if (READONLY || !isAdminFn()) return;`. Names and icons escaped with `esc()`; ids passed to inline handlers through `jsq()`. Values clamped/validated before writing. Note: like the rest of the app, enforcement is client-side because DB rules are open (rules are out of scope and untouched).

## Cost guardrails
Spark plan, no new service/dependency. Catalog capped at 50 entries; one small subtree added to the existing `/state` read. No rules, auth, URL or PIN changes. Tests use mocks only.

## Flagged concerns
Redemption flows (#52, #53) will add `rewardRequests`; this slice deliberately stores no per-member data.
