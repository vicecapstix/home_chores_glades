# Spec: parent sign-in (#97)

## Behaviour
- Parents sign in with email + password (Firebase Auth email/password). Kids and the TV keep anonymous sign-in. The app never stores the password; Firebase's SDK holds the session token.
- New modal `parent-modal` (email, password, Sign in, Cancel). Opened from a "Parent sign in" button on the login screen and from the Admin Panel. Admin Panel also shows "Sign out" while signed in with an email account. Sign out returns the client to anonymous auth.
- Errors (wrong password, auth/operation-not-allowed, network) go through `showToast` with a friendly message.
- `isAdmin()`:
  - READONLY -> false; zero members -> true (setup mode), both unchanged.
  - If `/admins` has at least one entry: true only when the signed-in UID is a key in `/admins`.
  - Otherwise (path missing/empty): today's `role === 'admin'` behaviour. Nothing breaks before rollout.
- After a parent signs in on the login screen, if `/admins/<uid>` names an existing member the session is that member; otherwise the login screen just closes.

## UI states
- Admin (parent signed in): Admin Panel shows Sign out. Member: no admin controls; login screen shows "Parent sign in". Read-only TV (`?readonly=1`): login screen never shown, no parent UI, no writes.

## Data shape
- New root path `/admins/<uid>: "<member name>"` (outside `/state`). Read by a separate `onValue` listener into `state.admins` (null when absent). `state.uid` mirrors the current auth UID.
- Rules: `"admins": { ".read": "auth != null", ".write": false }`. JT adds entries in the Console (Console bypasses rules).

## Security / RBAC notes
- This slice only changes the client's notion of admin and adds the unwritable `/admins` list. It does not yet block non-admin writes to `/state` in rules (that follows in #95 using `root.child('admins').child(auth.uid).exists()`).
- Client checks are UX; rules are the real control once enforced.
- Sign-in/out helpers guard `READONLY`.

## Cost guardrail check
Email/password, anonymous auth and rules are free on Spark. One extra small listener on `/admins`. No new deps, services, keys. Stays on GitHub Pages.

## Flagged concerns
- Signing in with email replaces the anonymous user; sign out creates a new anonymous UID (nothing is keyed to the anon UID).
- The `/admins` value (member name) is not required to match a member; a missing mapping is tolerated.
