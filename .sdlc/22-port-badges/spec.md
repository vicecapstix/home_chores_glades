# Spec — #22 Port 8 milestone badges into src/config.js
Behaviour: BADGES in src/config.js = first(>=1), getting_started(>=10), tenacious(>=25), half_century(>=50), century(>=100 completions), consistent(streak>=3), on_fire(>=7), dedicated(>=30), in the live build's order. Ids are unchanged so stored `badges` arrays keep rendering.
UI states: admin/member/readonly TV — badge icons on leaderboard and member chips (existing rendering, no markup change).
Data shape: none (members[].badges holds ids as before). Existing members are awarded newly-qualifying badges on their next completion via the existing tasks.js logic.
Security/RBAC: none; config only. Cost: none. Concerns: root index.html not regenerated here (see draft rebuild PR #60).
