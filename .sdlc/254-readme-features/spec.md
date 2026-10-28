# Spec (#254)

## Behaviour
README "Features" gains short lines for features merged 25–27 Oct, each verified on main:
- TV auto-cycle — `?readonly=1&cycle=1` rotates Chores → Leaderboard → Rewards (`src/tv.js` `createTvCycle`, `TV_CYCLE` in `src/config.js`)
- Reward weekly limits — `perWeek` on a reward, "n/N this week" (`src/rewards.js`)
- Due-time reminders — one notification per chore per day once its due time passes (`src/notifications.js` `selectDueTimeTasks`)
- "To give" list with Given ✓ (`src/rewards.js`, `markGiven` in `src/redemptions.js`)
- Points on each chore card (`src/render.js` `taskPoints`), shared ranks for ties (`src/ui.js`)
- Activity history includes reward requests and refunds (`src/history.js` `redemptionEvents`)

## UI states
None — docs only. Admin / member / TV views unchanged.

## Data shape
No /state change.

## Security / RBAC
None. No `src/` change, so root deploy files are unchanged.

## Cost guardrails
Docs only; no services, dependencies or DB access.
