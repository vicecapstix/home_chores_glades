# Spec — #240 keep the Parent check flag everywhere chores are copied

**Behaviour.** `needsCheck` (true only) is kept by: template save/apply (`ui.js`), the built-in starter list (four chores flagged: Clean the toilet, Scrub the shower, Tidy your room, Clean the oven; the Add-from-list modal shows "✓ Parent check"), chore download and upload (`chorefile.js`; upload accepts only boolean `true`, anything else is ignored). The printable chart adds a ✓ after flagged chore names. History rows show "✓ checked by <parent>" when the entry has `checkedBy` (already written by #238).

**UI states.** Admin only for templates, starter, chore file and print. History and chart show the mark to anyone who can open them; TV unaffected (no history/print there).

**Data shape.** `needsCheck: true` may now appear on `templates/<id>/tasks[]` items; no other shape change, no migration. Legacy templates and files without the flag work as before.

**Security / RBAC.** Existing guards unchanged (all four write paths are admin-only and READONLY-guarded). The upload ignores non-`true` values. All names escape through `esc()`.

**Cost guardrails.** One boolean per template task; template/chore caps unchanged.

**Concerns.** Dependencies #238, #233 and #234 are all on main, so no part is skipped.
