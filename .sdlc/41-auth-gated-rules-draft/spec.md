# Spec — #41 Auth-gated rules draft, PIN lockout

## Behaviour
1. **Sign-in gate.** `initAuth()` (src/firebase.js) now returns `{ ok, code, message }` instead of swallowing the outcome. `main.js` still awaits it before attaching the `onValue` listener (already true today). If `ok === false` the app keeps loading (so it works *before* and *after* the rules change) but shows a persistent-style toast built by `describeAuthFailure()`: "Anonymous sign-in is off — enable it in Firebase Console → Authentication → Sign-in method". A `PERMISSION_DENIED` read error gets the same hint.
2. **Rules draft.** New root file `firebase-rules.json`, NOT deployed anywhere: `auth != null` for read and write on `/state`; keeps `newData.hasChild('nextId')`; adds permissive shape checks (types, enums, length caps, history index < 500). Unknown fields are allowed so existing features keep working.
3. **PIN lockout.** 5 wrong PINs for one member -> that member's PIN pad is locked for 5 minutes on this device (`localStorage` key `fc_pin_fail`, per member). Correct PIN clears the counter. Locked pad shows "Too many attempts. Try again in N min."
4. **README** gets exact Console steps (enable Anonymous sign-in, paste rules, how to roll back).

## UI states
Admin / member: lockout message in the existing `#pin-member-error`. Auth-failure toast for all signed-in roles. Readonly TV: no PIN pad; still gets the auth toast (it needs a token once rules are applied).

## Data shape (/state)
No change to data. No new writes anywhere.

## Security / RBAC notes
- Rules only gate *unauthenticated* access (raw REST/bots). Anyone opening the site still gets an anonymous token, so pinHash stays readable to app users and the lockout is client-side only (bypassable by clearing storage or reading hashes). Real fix is epic #95.
- Live rules are never touched by this PR; JT pastes them in the Console.

## Cost guardrails
Anonymous Auth and Realtime Database rules are free on Spark. No new deps/services/secrets. Pass.

## Concerns
- Rules were not run in the Firebase emulator (needs a download + JVM); JT should paste them into **Rules Playground** before publishing. Rollback is to re-paste the old open rules (in README).
- Legacy array-shaped `members` (migrated client-side) is explicitly allowed by the rules (`isString()` branch).
