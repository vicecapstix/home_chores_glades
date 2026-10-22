# Spec 106
- `currentStreak(m, now=Date.now())` (utils.js): returns m.streak if m.lastStreakDate is today or yesterday (local, via localDateStr), else 0. Missing member/date/streak => 0.
- Used by member chips (render.js, shown when >=2), leaderboard row (ui.js, >0), TV strip (tv.js, >0).
- UI: admin, member and read-only TV all stop showing the flame once the streak is stale. Display only.
- Data: no shape change, no writes (stored m.streak untouched; completion logic unchanged).
- Security/RBAC: no write path, so no READONLY/isAdmin change; output is numeric (no esc needed).
- Cost guardrail: no new reads/writes/services/deps.
- Concern: timezone is device-local, consistent with how lastStreakDate is written.
