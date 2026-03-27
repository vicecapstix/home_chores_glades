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

## Coding standards

### Always read before editing
Read the relevant section of `index.html` before making any change. Never guess at line numbers or existing code structure.

### CSS rules — never inline display
Modal visibility is controlled exclusively via the `.hidden` CSS class + a matching `#id { display:flex }` / `#id.hidden { display:none }` rule pair in the `<style>` block. **Never put `display:flex/block` in an inline `style=""` attribute on a modal** — it overrides `.hidden { display:none }` due to CSS specificity and breaks show/hide.

### Modal pattern
Every new modal must follow this exact pattern:
```html
<!-- HTML: start hidden -->
<div id="foo-modal" class="hidden" onclick="window.closeFoo()">
  <div class="lb-card" onclick="event.stopPropagation()">...</div>
</div>
```
```css
/* CSS: layout rule + hidden override */
#foo-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 998; }
#foo-modal.hidden { display: none; }
```
```js
// JS: open/close toggle class only
window.openFoo  = function() { document.getElementById('foo-modal').classList.remove('hidden'); };
window.closeFoo = function() { document.getElementById('foo-modal').classList.add('hidden'); };
```

### JS guards — always check READONLY and isAdmin()
- Any function that writes data must start with `if (READONLY) return;`
- Any function that is admin-only must start with `if (READONLY || !isAdmin()) return;`
- `isAdmin()` returns `true` when there are zero members (setup mode) — do not break this.

### XSS — always use esc()
Every piece of user-supplied data injected into `innerHTML` or an `onclick` string attribute must be wrapped in `esc()`. This includes task names, member names, category names, notes previews, and template names.

### Firebase writes
- Use granular `update(ref(db, 'state/...'), patch)` for single-field changes
- Use `writeState()` (full state write) only when multiple top-level fields change together
- Every Firebase call must be wrapped in try/catch with `showToast()` for errors

### Task data shape
```js
{
  id, name, freq,          // freq: 'daily'|'weekly'|'fortnightly'|'monthly'|'once'
  dueDate,                 // YYYY-MM-DD string, only used when freq==='once'
  person, done, lastDone,
  lastDoneBy, lastDonePoints,  // set on check, cleared on uncheck — prevents point farming
  notes, difficulty,       // difficulty: 'easy'|'medium'|'hard'
  category,                // one of the predefined category strings, or ''
  subtasks, order
}
```

### Member data shape
```js
{
  name, role,              // role: 'admin'|'member'
  pinHash,                 // SHA-256 of 4-digit PIN, or '' if no PIN set
  points, weekPoints, weekStart,
  streak, lastStreakDate,
  completedCount, badges
}
```

### Branch
All work goes to `claude/fix-mobile-issues-HANDi`. Never push to `main` directly.

### Commit messages
One concise subject line summarising what changed and why. List each changed behaviour as a bullet in the body. Always append the session URL on the final line.

---

## Changing the PIN
1. Decide on a new 6-digit PIN
2. Run in browser console: `crypto.subtle.digest('SHA-256', new TextEncoder().encode('123456')).then(b => console.log(Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('')))`
3. Replace `CORRECT_HASH` in `index.html` with the output
