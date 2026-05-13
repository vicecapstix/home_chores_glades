# CLAUDE.md — FamilyFlow

## Project overview
A real-time family chore tracker (named **FamilyFlow**) hosted on GitHub Pages. Built with vanilla JS modules bundled by Vite into a single self-contained `index.html` via `vite-plugin-singlefile`. Open `dist/index.html` directly in a browser, or push to `main` for GitHub Pages to serve it.

## Tech stack
- Vanilla HTML/CSS/JS (ES modules)
- Firebase Realtime Database (SDK ^10.12.2, installed via npm)
- Firebase Anonymous Auth (optional — gracefully degrades if not enabled)
- Vite 5 + vite-plugin-singlefile (bundles everything into one `dist/index.html`)
- No UI framework

## File structure
```
src/
  index.html       — HTML shell; minimal JS (only theme-restore inline script)
  style.css        — all CSS (imported in main.js)
  main.js          — entry point: bootstrap, window.* handlers, event listeners
  config.js        — constants: FB_URL, PCOLS, CATEGORIES, BADGES, READONLY
  state.js         — central mutable state object; applySnapshot, migrateLegacyMembers
  firebase.js      — Firebase init + all write helpers (writeState, patchTask, …)
  auth.js          — login/session flow, member PIN, isAdmin, currentMember
  utils.js         — pure helpers: esc, sha256, dueStatus, taskPoints, freqDays, …
  ui.js            — showToast, toggleTheme, leaderboard, stats, templates, modals
  tasks.js         — task CRUD, toggle (check/uncheck), subtasks, claim, drag-drop
  members.js       — member add/remove/toggleRole
  render.js        — DOM rendering: render(), cardHTML(), filters, select/bulk mode
  modals.js        — modal stack manager + browser back-button support
  notifications.js — overdue browser notifications (30-min interval check)
  undo.js          — command-pattern undo stack (max 20, 5s toast window)
dist/
  index.html       — Vite build output (single self-contained file)
CLAUDE.md          — this file
README.md          — user-facing docs
package.json
vite.config.js
```

## Development workflow

```bash
npm install          # install deps (Vite + firebase + vite-plugin-singlefile)
npm run dev          # Vite dev server at http://localhost:5173 (hot reload)
npm run build        # bundle → dist/index.html (deploy this to GitHub Pages)
npm run preview      # serve the built dist/ locally
```

GitHub Pages is configured to serve from `main` / `/ (root)` — the built `dist/index.html` must be committed and pushed to deploy.

## Key constants / configuration

| Thing | File | Notes |
|---|---|---|
| Firebase DB URL | `src/config.js` line 1 | `FB_URL` constant |
| Member colours | `src/config.js` lines 3–10 | `PCOLS` array — 6 colour pairs that cycle |
| Categories | `src/config.js` line 12 | `CATEGORIES` array |
| Badges | `src/config.js` lines 14–19 | `BADGES` — id, label, icon, check function |
| READONLY flag | `src/config.js` line 21 | set by `?readonly=1` URL param |

## Firebase setup
Database path: `/state`
```
/state
  members:   { "Alice": { name, role, pinHash, points, weekPoints, weekStart,
                           streak, lastStreakDate, completedCount, badges }, … }
  tasks:     { "t<timestamp>": { id, name, freq, person, done, lastDone, … } }
  history:   [ { taskId, taskName, person, completedAt, points }, … ]  ← max 500
  nextId:    <number>
  templates: { "tpl<timestamp>": { id, name, tasks: [{name,freq,difficulty}] } }
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
> The validate rule checks `nextId` (always present), NOT `members` or `tasks` — Firebase drops empty arrays/objects as null, which causes validation failures when either list is empty.

Firebase Anonymous Auth is initialized in `src/firebase.js:initAuth()` and gracefully degrades if not enabled in the Firebase Console.

## Architecture overview

### Data flow
1. `main.js` bootstraps Firebase, attaches an `onValue` listener on `/state`
2. Every snapshot triggers `applySnapshot()` (updates the shared `state` object) then `render()`
3. All writes go through helpers in `firebase.js`; the `onValue` listener reflects the change back automatically
4. The shared `state` object in `src/state.js` is mutated in place — all modules import and read it directly

### Module dependency graph (simplified)
```
main.js
 ├── config.js         (no local imports)
 ├── state.js          (no local imports)
 ├── utils.js          (no local imports)
 ├── firebase.js       → config, state
 ├── modals.js         (no local imports)
 ├── undo.js           (lazy-imports ui.js)
 ├── auth.js           → state, config, utils
 ├── ui.js             → state, config, modals, firebase, utils, auth
 ├── tasks.js          → state, config, firebase, ui, undo, utils
 ├── members.js        → state, config, firebase, ui
 ├── render.js         → state, config, utils, ui
 └── notifications.js  → state, utils
```

### Window handlers
All functions called from inline `onclick` HTML attributes are exposed as `window.*` in `main.js`. This is intentional — Vite bundles the modules so inline handlers cannot reach them otherwise.

### Modal system (`src/modals.js`)
Modals are managed via a stack. `openModal(id)` / `closeModal(id)` toggle the `.hidden` class and push/pop from the stack. The browser back button closes the topmost modal via a `popstate` listener.

### Undo system (`src/undo.js`)
Command pattern — each undoable action calls `pushUndo({ label, undo })` where `undo` is an async function. The undo toast auto-expires after 5 s and pops the oldest entry.

## Coding standards

### Always read before editing
Read the relevant section of a `src/` file before making any change. Never guess at line numbers or existing code structure.

### CSS rules — never inline display
Modal visibility is controlled exclusively via the `.hidden` CSS class + a matching `#id { display:flex }` / `#id.hidden { display:none }` rule pair in `src/style.css`. **Never put `display:flex/block` in an inline `style=""` attribute on a modal** — it overrides `.hidden { display:none }` due to CSS specificity and breaks show/hide.

### Modal pattern
Every new modal must follow this exact pattern:

```html
<!-- src/index.html: start hidden -->
<div id="foo-modal" class="hidden" onclick="window.closeFoo()">
  <div class="lb-card" onclick="event.stopPropagation()">...</div>
</div>
```
```css
/* src/style.css: layout rule + hidden override */
#foo-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 998; }
#foo-modal.hidden { display: none; }
```
```js
// src/ui.js or src/main.js: use the modal manager
import { openModal, closeModal } from './modals.js';
window.openFoo  = function() { openModal('foo-modal'); };
window.closeFoo = function() { closeModal('foo-modal'); };
```

### JS guards — always check READONLY and isAdmin()
- Any function that writes data must start with `if (READONLY) return;`
- Any function that is admin-only must start with `if (READONLY || !isAdminFn()) return;`
- `isAdmin()` (in `src/auth.js`) returns `true` when there are zero members (setup mode) — do not break this
- Task and member write functions receive `isAdminFn` as a parameter (bound in `main.js`) rather than importing `isAdmin` directly — this avoids circular imports

### XSS — always use esc()
Every piece of user-supplied data injected into `innerHTML` or an `onclick` string attribute must be wrapped in `esc()` from `src/utils.js`. This includes task names, member names, category names, notes previews, template names, and subtask names.

### Firebase writes
- Use granular patch helpers for single-field changes:
  - `patchTask(id, fields)` — updates `state/tasks/<id>`
  - `patchMember(name, fields)` — updates `state/members/<name>`
  - `patchRoot(fields)` — updates `state` directly (e.g. `history`)
  - `patchSubtask(taskId, subId, fields)` — updates a single subtask field
- Use `writeState()` (full state write) only when multiple top-level fields change at once (e.g. adding a task also increments `nextId`)
- Every Firebase call must be wrapped in try/catch with `showToast()` for errors

### Task data shape
```js
{
  id,            // 't' + Date.now() — alphanumeric, safe in HTML id attrs
  name,
  freq,          // 'daily'|'weekly'|'fortnightly'|'monthly'|'once'
  dueDate,       // YYYY-MM-DD string, only used when freq === 'once'
  person,        // member name string, or '' for "Anyone"
  done,          // boolean
  lastDone,      // timestamp ms
  lastDoneBy,    // member name — set on check, cleared on uncheck (prevents point farming)
  lastDonePoints,// points awarded — set on check, cleared on uncheck
  notes,         // string, max 300 chars
  difficulty,    // 'easy'|'medium'|'hard'
  category,      // one of CATEGORIES or ''
  subtasks,      // { 's<timestamp>': { id, name, done } }
  order,         // number used for drag-and-drop ordering
}
```

### Member data shape
```js
{
  name,
  role,           // 'admin'|'member'
  pinHash,        // SHA-256 of 4-digit PIN, or '' if no PIN set
  points,         // all-time points total
  weekPoints,     // points earned in current week
  weekStart,      // YYYY-MM-DD of the Monday that started the current week
  streak,         // consecutive days with at least one completion
  lastStreakDate, // YYYY-MM-DD of last completion (for streak tracking)
  completedCount, // all-time task completions
  badges,         // string[] — badge ids: 'first', 'century', 'on_fire', 'dedicated'
}
```

### Legacy member migration
Old state stored members as `["Alice", "Bob"]`. `migrateLegacyMembers()` in `src/state.js` handles the array→object conversion transparently on every `onValue` snapshot.

### Points system
`taskPoints(t)` in `src/utils.js` computes points as `baseByFreq × difficultyMultiplier`:
- Frequency base: daily=1, weekly=3, fortnightly=5, monthly/once=8
- Difficulty multiplier: easy=1, medium=2, hard=3

Points are reversed (subtracted) when a task is unchecked, using `lastDoneBy` / `lastDonePoints` to identify who earned them and how many.

### Branch and commits
- Development branches follow the pattern `claude/<description>-<id>`
- Never push to `main` directly
- Commit message format: one concise subject line + bullet-point body listing each changed behaviour + session URL on the final line

---

## Changing the house PIN
The house-level PIN was removed in the current version — login is now per-member only. Each member can have an optional 4-digit PIN set by an admin via the Admin Panel → "Set PIN".

To set a member PIN hash manually (browser console):
```js
crypto.subtle.digest('SHA-256', new TextEncoder().encode('1234'))
  .then(b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2,'0')).join(''))
  .then(hash => console.log(hash));
// Then PATCH /state/members/<name>/pinHash with the hash via Firebase REST API
```
