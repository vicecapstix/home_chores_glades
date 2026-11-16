# Intent — #353: Admin data size readout

**Problem:** Nothing shows how big `/state` is. Every device downloads the whole state on start, so growth drives Spark download usage (10 GB/month, 1 GB stored). Parents have no early warning.

**Acceptance criteria**
- [ ] Admin Panel shows approximate state size (bytes of `JSON.stringify(state)`, PIN hashes excluded) and counts for history (/500), redemptions (/100), templates, rewards, tasks
- [ ] Rough monthly download estimate = size x devices x daily opens, with the assumption stated in the text
- [ ] Amber note above 1 MB of state
- [ ] Hidden for members and on the readonly TV
- [ ] No extra Firebase reads (computed from the in-memory state)

**Constraints:** display only; no writes, no new reads; no `src/restore.js` or member-rename changes; free-tier/no-deps guardrails.
