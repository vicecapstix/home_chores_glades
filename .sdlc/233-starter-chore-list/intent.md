# Intent — #233: Default chore list: pick chores from a built-in starter list (survives a wipe)

Queue position: 0

## Problem
At the security cutover (#101) JT will wipe everything, including the chore list. Today the only way to get chores back is to type each one in again (saved templates live in the database, so they are wiped too). JT wants a default list of chores that always stays available to pick from.

## Outcome / acceptance criteria
- [ ] A built-in starter list of about 30 common family chores is shipped in the app code (e.g. `src/starter.js`), not in the database, so a wipe never removes it. Each entry has `name`, `freq` (and `days`/`intervalDays` where needed), `difficulty`, `category` (one of `CATEGORIES`)
- [ ] Admin sees **"Add from list"** next to the add-chore bar: a modal (standard `.hidden` modal pattern + `a11y.js`) with the starter chores grouped by category, each with a checkbox, frequency and points; "Select all in category"; **Add selected**
- [ ] Chores that already exist (same name, case-insensitive) are shown ticked-and-disabled with "already added", so they can't be added twice
- [ ] Added chores go in with **one multi-path update** (`tasks/<id>` for each + `nextId`), assigned to "Anyone", not done, with a correct initial `lastDone`
- [ ] When there are no chores at all (e.g. right after Start fresh), the empty chore list shows a prompt: "No chores yet — Add from list"
- [ ] READONLY and non-admins can't open it or write (`if (READONLY || !isAdminFn()) return;`); TV view never shows the button
- [ ] All names escaped with `esc()`; works at phone width

## Affected users
Admin (sets up chores). Members and the readonly TV see the chores that get added.

## Constraints
- Cost guardrails: stays on GitHub Pages (`main` / root) and the existing Firebase RTDB on the free Spark plan. No Blaze-only features, no new services, API keys, secrets or paid hosting. Never write to or change rules on the live DB; tests mock Firebase.
- The list is static code (a few KB in the bundle); it adds no database reads.
- Diff ≤ ~300 lines with tests.

## Open questions
None. (JT can edit the list later in `src/starter.js`.)

## Verification
Vitest: the starter list is valid (every freq/difficulty/category allowed, names unique); `addStarterChores([...])` sends one `patchPaths` with the chosen tasks + `nextId`, skips existing names, and is refused for READONLY and non-admins. `npm test` and `npm run build` pass.

Needed by #101 (Start fresh). Part of #95.

