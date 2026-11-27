# Spec — #362 Birthday banner
## Behaviour
Admin Panel member row has a small `MM-DD` field. `setBirthday(name, value, isAdminFn)` validates (real calendar day, 29 Feb allowed; invalid → toast, no write; empty clears) and patches `members/<name>/birthday` only. `render()` calls `renderBirthdayBanner()`: on the local date a banner `🎂 Happy birthday, <name>!` (several: `A and B`) shows. Text is set with `textContent`, so names can't inject markup. 29 Feb members are celebrated on 28 Feb in non-leap years. Invalid stored values are ignored.
## UI states
Admin: field in Admin Panel + banner. Member: banner (everyone sees it, including the birthday member's own screen); no field. Readonly TV: banner (large, shared `.double-banner` style), no field/writes.
## Data shape
New optional `members/<name>/birthday: 'MM-DD'`. No year or age stored. Rename keeps it (rename copies the member record; covered by a test).
## Security / RBAC
`if (READONLY || !isAdminFn()) return;` on the only write; admin fn passed from main.js; name via `esc()`/`jsq()` in the field; banner via textContent. No PIN data touched.
## Cost guardrails
One tiny string per member; one patch per edit; no services/deps.
## Flagged concerns
`src/restore.js` rebuilds members from a whitelist, so a restore drops `birthday` (admin must re-enter). Not changed here because restore is always-JT; follow-up needed. Backup download already includes the field.
