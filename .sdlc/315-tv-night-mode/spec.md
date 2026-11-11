# Spec: TV night mode

**Behaviour:** isNightTime (21:00 <= t < 06:30, local). updateTvNight toggles body.tv-night only when READONLY, night, and past the wake time. wakeTv (keydown/pointerdown) sets a 5 minute wake. rollover.js tick (60 s) calls updateTvNight, so boundaries switch automatically. createTvCycle takes a paused() option; while dim the cycle returns to the chores screen and does not advance.

**UI:** TV: CSS dark overlay (rgba 0.85, pointer-events none so taps still wake). Admin/member: never dimmed (READONLY false). No new controls.

**/state:** none. **Security/RBAC:** display only, no writes, no window.* handlers, no storage. **Cost:** none. **Concerns:** hours fixed (an admin setting is a later issue); the clock stays visible but dimmed.
