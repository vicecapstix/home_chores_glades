# CLAUDE.md — FamilyChores

## Project overview
A real-time family chore tracker hosted on GitHub Pages. Single HTML file — no build step, no npm, no bundler. Open `index.html` directly or push to the `main` branch for GitHub Pages to serve it.

## Tech stack
- Vanilla HTML/CSS/JS (ES modules)
- Firebase Realtime Database (SDK 10.12.2, loaded from CDN)
- No frameworks, no build tools

## File structure
```
index.html   — entire app (HTML + CSS + JS in one file)
README.md    — user-facing docs
CLAUDE.md    — this file
```

## Key constants / configuration

| Thing | Where | Notes |
|---|---|---|
| Firebase DB URL | `index.html` ~line 340 | `FB_URL` constant |
| PIN hash | `index.html` ~line 220 | `CORRECT_HASH` — SHA-256 of the 6-digit PIN; change this to update the PIN |
| Member colours | `index.html` ~line 344 | `PCOLS` array — 6 colour pairs that cycle |

## Firebase setup
Database path: `/state`
```
/state
  members:  ["Alice", "Bob", ...]   ← stored as object {0:"Alice", 1:"Bob"}
  tasks:    { "t<timestamp>": { id, name, freq, person, done, lastDone } }
  nextId:   <number>
```

Required rules (Firebase Console → Realtime Database → Rules):
```json
{
  "rules": {
    "state": {
      ".read": true,
      ".write": true,
      ".validate": "newData.hasChild('nextId')"
    }
  }
}
```
> The validate rule must check `nextId` (always present), NOT `members` or `tasks` — Firebase drops empty arrays/objects as null, which would cause validation failures when either list is empty.

## Development conventions
- **All user input injected into `innerHTML` must use `esc()`** — the helper at ~line 380 escapes `&`, `<`, `>`, `"`, `'`.
- **All Firebase errors must surface via `showToast()`** — wrap every Firebase call in try/catch or add an error callback.
- Keep it a single file. Don't add a build step or split into multiple files unless there's a very good reason.
- Task IDs are `'t' + Date.now()` — alphanumeric, safe for use in HTML `id` attrs and `onclick` strings without escaping.

## Changing the PIN
1. Decide on a new 6-digit PIN
2. Run in browser console: `crypto.subtle.digest('SHA-256', new TextEncoder().encode('123456')).then(b => console.log(Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('')))`
3. Replace `CORRECT_HASH` in `index.html` with the output
