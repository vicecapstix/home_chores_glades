# Spec — #247 coerce database points before rendering

**Behaviour.** A new `num(x)` helper (`Number(x)`, non-finite becomes 0) is used wherever points from /state are summed or printed: `weekRecap`, `memberWeeks`, `currentWeekPoints` (utils), all-time/this-week leaderboard sort and rows (ui), member chips (render). TV strip and champion line get it through `currentWeekPoints` and `weekRecap`. A string such as `<img ...>` becomes 0 instead of markup; a numeric string such as "5" still counts as 5.

**UI states.** Admin, member and read-only TV all render identically for valid data; only hostile values change (shown as 0).

**Data shape.** None. Nothing is written.

**Security.** Closes the stored-XSS gap on points fields. Names and notes were already `esc()`'d. No new write path or handler.

**Cost guardrails.** Pure rendering change, no reads, no services.

**Concerns.** `fairness.js` also sums `e.points` but only prints it through `esc()`, so it is not an XSS path; left alone to keep the diff small.
