# Spec #227 — streak freeze
**Behaviour:** `nextStreak` (utils.js, pure) gives +1 freeze when a streak increases to a multiple of 7 (max 2 held). If the last completion was exactly 2 days ago, a freeze is held and the house is not paused, the freeze is spent and the streak continues (+1). Otherwise unchanged rules (yesterday +1, same day no change, else reset to 1). Uncheck restores streak, lastStreakDate and freezes (`prevFreezes` on the task). `currentStreak` keeps showing the streak after a one-day gap while a freeze is held.
**UI:** ❄️N after the 🔥streak on member chip, leaderboard and TV strip (read-only text; hidden when 0). No new controls, so no admin/member difference.
**Data (/state):** additive `members/<name>/freezes` (0-2, clamped on read) and `tasks/<id>/prevFreezes` (cleared on uncheck). Written inside the existing member patch/task update, no new write path.
**Security:** no new write paths or HTML inputs; numeric value clamped; `freezeTag` outputs a number only.
**Cost:** two small numeric fields; no new reads/services.
**Concerns:** `src/restore.js` whitelists member fields, so a restore drops `freezes` (members restart at 0). Left alone because restore is an always-JT file; follow-up if wanted.
