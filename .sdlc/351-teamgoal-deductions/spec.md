# Spec #351
- Behaviour: teamGoalProgress sums every history entry (completions, bonus, deductions) in the local Mon-Sun week directly; earned = max(0,total). weekRecap untouched (leaderboard unchanged).
- UI: team goal bar/TV show the corrected number; no new UI states for admin/member/readonly TV.
- Data: no /state shape change. No writes.
- Security/RBAC: none; display-only.
- Cost: no new services/deps; history stays capped at 500.
- Concerns: entries without a person were already skipped by weekRecap; keep that (require e.person).
