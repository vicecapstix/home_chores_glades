# Intent — #86 Safe member rename
Copy of issue: Safe member rename (migrate key, tasks, history; keep points and PIN hash). Part of #56.
Problem: renaming requires delete + re-add (losing points) because names are DB keys.
Acceptance: admin can rename, member key moves with all fields unchanged (incl. pinHash, avatar); tasks' person and history person reassigned in one multi-path update; same validation as addMember, duplicates rejected; tests.
Constraints: cost guardrails (#56); no PIN hash change; history stays capped at 500.
