# Spec #170
- Behaviour: renderLeaderboard sorts by points desc then name, and ranks with standard competition ranking (equal points share a rank: 1,1,3) on All-time and This-week tabs, matching Last week.
- UI: same modal for admin/member; TV unaffected (no leaderboard there). No markup change.
- Data/RBAC/cost: none (display only).
- Concern: week tab compares currentWeekPoints (stale weeks count as 0).
