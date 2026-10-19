# Spec — #97 Parent email sign-in and /admins allowlist

## Behaviour
- Login screen: **Parent sign in** link → email + password form (`#parent-signin`). Errors are shown inline (`describeParentSignInError`); the password field is cleared after every attempt and never stored.
- On success, if the UID is mapped in `/admins`, the parent is logged in as that member. Otherwise a toast shows the UID to add in the Console.
- `/admins/<uid>: "<member name>"` at the database root, watched by `watchAdmins()`. A read error (rules not applied yet) counts as empty.
- `isAdmin()`: once `/admins` has entries, true only when the signed-in UID is listed. Until then, today's role-based behaviour, including setup mode.
- **Switch User** (and Admin Panel **Parent sign out**) signs the parent out; the existing `onAuthStateChanged` handler signs the device back in anonymously.
- Admin Panel shows parent status (email, and the UID when not yet in `/admins`) or a **Parent sign in** button while `/admins` is empty.
- `FB_API_KEY` / `FB_AUTH_DOMAIN` / `FB_PROJECT_ID` in `src/config.js`. Empty key → app runs as today (no auth) and the form says the key is missing. Without a key, anonymous sign-in also fails today (`auth/invalid-api-key`).
- Fix: `#pin-member-pin.hidden` had no CSS rule, so the kid PIN pad always showed on the login screen.

## Data shape
New root node `/admins` (outside `/state`), written only in the Console.

## Security / RBAC
Rules: `/admins` readable when signed in, `.write: false` for all clients (emulator tests in `tests/rules/admins.test.js`). Server-side enforcement of admin-only writes is #98; this PR only changes who the client treats as admin.

## Cost guardrails
Email/Password auth is free on Spark. No new services or secrets (the web API key is a public identifier).

## Concerns
- `FB_API_KEY` must be filled in by JT before any sign-in works.
- A parent signed in on a kid's device stays signed in until Switch User or Parent sign out (Firebase local persistence).
