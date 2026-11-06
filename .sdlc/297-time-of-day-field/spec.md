# Spec — #297
**Behaviour:** optional task field `timeOfDay` = `'morning' | 'afternoon' | 'evening'` (label for `afternoon` is "After school"). Omitted when unset; any other value is ignored everywhere.
- Add form (`#new-timeofday`) and Edit card (`.edit-timeofday`) get a "Time of day" select (admin only; `addTask`/`saveTask` already return unless admin and not READONLY).
- `saveTask` writes `tasks/<id>/timeOfDay` (null clears it) in the existing multi-path update.
- Template save (`templateTask`), apply (`applyTemplate`) and chore-file build/validate keep it, validated against the three values.
- `cardHTML` shows a small tag (`🕒 Morning` etc.) for chores with a valid value.
- Restore needs no change (it passes unknown task fields through); render trusts only the three values, so a hand-edited backup can't inject markup.
**UI states:** admin sets it; member and TV (READONLY) see the tag only; no edit controls in READONLY (edit/add already hidden there).
**Data:** `/state/tasks/<id>/timeOfDay` — one short optional string; no new collections, no change to rules/auth/PINs, nothing existing is reshaped.
**Security/RBAC:** admin-only write paths unchanged; value whitelisted; label is rendered from a fixed map (not from the stored string), and esc() is applied anyway.
**Cost guardrails:** a few bytes per task; no new services.
**Out of scope:** grouping/ordering and the "Now" filter (#298).
