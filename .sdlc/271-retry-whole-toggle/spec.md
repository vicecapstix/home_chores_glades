# Spec — #271 failed tick must not be retried as a bare task write

**Behaviour.** When the task write inside `applyToggle` rejects, `pending.js` no longer keeps the raw write as a retry. The card tag changes from the "tap to retry" button to a non-interactive "⚠ not saved — tap the chore again". The user taps the chore, which re-runs the whole toggle (points, streak, badges, history) against current state. The next write on that task clears the tag.

**UI states.** Admin / member: tag as above on the card. Read-only TV: writes never happen, so no tag. Non-toggle writes (edit, subtasks) keep the retry button.

**Data shape.** None. No change under /state.

**Security / RBAC.** No new write path, no new `window.*` handler. `retrySync` is unchanged. The tag has no user data.

**Cost guardrails.** No new reads, listeners or services; in-memory only.

**Concerns.** Uncheck failure already restores reversed points; the tag now matches (tap again).
