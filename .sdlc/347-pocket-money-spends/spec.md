# Spec — #347

**Behaviour:** "earned" = `points + spent`, where `members/<name>/spent` is the net points spent on rewards (spend adds, refund/deny subtracts, floor 0). `owed().pts = max(0, earned_now − earnedAtLastPayout)`. A new payout stores `earned` (= points + spent) next to the existing `points`. For payouts without `earned` (old ones) the baseline is `payout.points`, i.e. the old formula, so no migration is needed.

**UI states:** Admin chips + Mark paid, member chip, TV owed line all use `owed()`; no markup change. Pocket money off: nothing shown. READONLY: no writes (spend/refund are existing guarded paths).

**Data shape (/state):** new optional `members/<name>/spent` (number, written by the existing spend/refund transactions) and optional `earned` on new payout entries. Existing data untouched; nothing deleted or reshaped. Restore keeps unknown member fields already (`...clone(m)`), so no `src/restore.js` change.

**Security/RBAC:** no new write paths or handlers; spend/refund keep READONLY and `_live` guards. **Cost:** two tiny numbers per member; no new reads. **Concerns:** spends made before this ships are not known, so a payout taken before the change keeps the old behaviour for those earlier spends.
