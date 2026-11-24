# Intent: reward edit must not write back stale stock (#390)

**Problem**
`editReward` (src/rewards.js ~172) copies `r.stock` into the form; `saveReward` (~189) writes the whole reward with `patchRoot({['rewards/'+id]: full})`. If a child requests the reward while the form is open (the `reserveStock` transaction takes stock 3 → 2), a rename-only save writes 3 back, so an extra copy can be handed out.

**Outcome / acceptance criteria**
- [ ] Editing a reward without touching the stock field leaves `rewards/<id>/stock` untouched (only changed leaves are patched)
- [ ] If the admin changes stock, the change is applied relative to the value shown when Edit was tapped (transaction delta) or against the current value, never by overwriting a reservation
- [ ] New rewards and the 1–99 / unlimited validation work as today

**Affected users**
Admin (edits rewards), members (limited-stock rewards).

**Constraints**
- Granular patches; stock stays bounded 0–99.
- Cost guardrails: GitHub Pages hosting only (`main` / root); Firebase Realtime DB on the free Spark plan (no Blaze, Cloud Functions, Storage, Extensions or paid APIs); no new services, keys, secrets or dependencies; data stays bounded (history cap 500); tests mock Firebase and never touch the live DB.

**Open questions**
None.

**Verification**
Vitest: editReward → stock changes to 2 in state → rename + save → written payload has no stale stock (or stock 2). `npm test`, `npm run build`.

