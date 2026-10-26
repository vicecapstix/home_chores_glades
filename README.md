# FamilyFlow

A real-time chore tracker for families — assign tasks, track progress, earn points, and stay on top of what needs doing. Live across all devices via Firebase.

## Features

- **Real-time sync** — changes appear instantly on every device
- **Family members** — colour-coded chips with points, streaks, and badges
- **Per-member login** — each member selects their name and enters their own 4-digit PIN
- **Roles** — first member is admin (can add/edit/delete); other members can tick off, claim and uncheck chores, use **My chores**, and request rewards, but cannot add, edit or delete
- **TV / readonly view** — append `?readonly=1` to the URL for a display-only TV dashboard (no writes, no login)
- **Installable (PWA)** — add to your home screen; an offline indicator shows when the connection drops
- **Rewards** — admins define a rewards catalog; members spend points on requests, admins approve or deny them
- **Activity history** — recent completions, filterable by member
- **My chores** — filter to the chores assigned to you; reorder with the move up/down buttons
- **Dark mode** — toggle with the moon/sun button in the header
- **Chore frequencies** — daily, specific weekdays, weekly, fortnightly, monthly, or a one-off task with a due date; optional due time
- **Difficulty levels** — easy, medium, hard (affects points earned)
- **Subtasks** — break a chore into smaller steps
- **Notes** — attach a note to any task or chore
- **Status tracking** — Overdue / Due soon / On track / Done today sections
- **Inline editing** — edit a task's name, frequency, assignee, or difficulty without deleting it
- **Points & leaderboard** — members earn points for completing chores; see all-time and weekly rankings
- **Badges** — First Chore (1), Getting Started (10), Tenacious (25), Fifty Strong (50), Century (100 completions); Consistent (3-day streak), On Fire (7), Dedicated (30)
- **Templates** — save the current task list as a reusable template
- **Stats** — completion charts by week, month, or all time; export to CSV
- **Browser notifications** — get an alert when a chore goes overdue (requires permission)
- **Bulk actions** — select multiple tasks to bulk-assign or bulk-delete
- **Daily summary** — on first visit each day, shows what's overdue or due soon
- **PIN protection** — optional 4-digit PIN per member (see [RESET.md](RESET.md) if one is forgotten)
- **Progress header** — live count of total, done, overdue, and completion %

## Setup

### 1. Firebase Realtime Database

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project
2. Enable **Realtime Database** (Asia Southeast or your preferred region)
3. Copy the database URL and update `FB_URL` on line 1 of `src/config.js`:
   ```js
   export const FB_URL = 'https://your-project-default-rtdb.region.firebasedatabase.app';
   ```
   then merge to `main`; `.github/workflows/deploy-root.yml` rebuilds the root files for you (or run `npm run build:pages`, see [Development](#development)).
4. Set the database rules (**Realtime Database → Rules**). Start with the open rules below so the app works immediately:
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

#### Optional: require sign-in (tighter rules)

Proposed tighter rules are tracked in issue #41. `firebase-rules.json` in this repo is a **draft** that only lets signed-in clients read or write `/state` and checks the shape of members, tasks, history, rewards and redemptions. Nothing applies it automatically; you paste it yourself:

1. Firebase Console → **Authentication → Sign-in method** → enable **Anonymous**. (Free on the Spark plan. Until it is on, the app shows a toast saying so.)
2. Reload the app once so every device gets a token.
3. **Realtime Database → Rules**: paste the contents of `firebase-rules.json`, test a read and a write in the **Rules Playground** (authenticated), then **Publish**.
4. To roll back, paste the open rules from step 4 above and publish again.

#### Parent sign in (#97)

The login screen and Admin Panel have a **Parent sign in** (email + password; the app never stores the password). Until `/admins` exists in the database the app keeps using each member's `role`, so this is safe to deploy first. To switch to real parent accounts, do these in the Firebase Console (free on Spark):

1. **Authentication → Sign-in method**: enable **Email/Password**.
2. **Authentication → Users**: add one account per parent and copy each UID.
3. **Realtime Database → Data**: add `admins/<uid>` = the parent's member name (e.g. `Alice`). The rules above make `/admins` readable by signed-in users and not writable by any client, so only you can edit it in the Console.
4. Re-publish the rules from `firebase-rules.json`. To roll back, delete the `admins` node and the app falls back to roles.

Limit: anyone who opens the site gets an anonymous token, so PIN hashes stay readable from inside the app. These rules block raw REST/bot access without a token and malformed writes. After 5 wrong PINs a member's PIN pad locks for 5 minutes on that device (client-side only).

### 2. GitHub Pages

1. Merge to `main`. The deployed files are the **root** `index.html`, `sw.js`, `manifest.webmanifest` and the icons (generated by `npm run build:pages`; `dist/` is git-ignored)
2. Go to **Settings → Pages** and set source to `main` / `/ (root)`
3. Your app will be live at `https://<username>.github.io/<repo>/`

### 3. Setting per-member PINs

Each member can have an optional 4-digit PIN. An admin sets or changes it in the app: **Admin Panel → Set PIN** next to the member's name. If a member has no PIN set (`pinHash` is empty), they log in by just tapping their name. Forgotten PIN? See [RESET.md](RESET.md).

## Usage

| Action | How |
|---|---|
| Add a family member | Type name in the members bar → **+ Add** (or Enter) |
| Remove a member | Click **×** on their chip (admin only) |
| Add a chore | Fill in the add bar → **+ Add chore** (admin only) |
| Edit a chore | Tap/hover the card → click **✎** (admin only) |
| Mark done | Click the checkbox on the left |
| Uncheck a task | Click the checkbox again — points are reversed automatically |
| Delete a chore | Tap/hover the card → click **×** (admin only) |
| Filter tasks | Use the pill buttons (All / Pending / Overdue / Done today) |
| Bulk actions | Click **Select** in the header, pick tasks, then assign or delete |
| Leaderboard | Click **🏆** in the header |
| Stats & export | Click **📊** in the header |
| Templates | Click **📋** in the header |
| Dark mode | Click **🌙 / ☀️** in the header |
| Readonly view | Add `?readonly=1` to the URL |
| Close any modal | Tap ×, tap outside, or press the browser back button |

## Tech

- Vanilla HTML/CSS/JS (ES modules) — no UI framework
- [Vite](https://vitejs.dev/) bundles `src/` into a single self-contained `index.html`
- [Firebase Realtime Database](https://firebase.google.com/docs/database) for live sync
- Hosted on GitHub Pages (free)

## Development

```bash
npm ci               # install dependencies
npm run dev          # Vite dev server at http://localhost:5173
npm test             # unit tests (Vitest, Firebase mocked)
npm run build        # bundle to dist/index.html (git-ignored)
npm run build:pages  # build and copy the deployed files to the repo root
npm run preview      # serve the built dist/ locally
```

You do not need to commit the root files in a PR: after each merge to `main`, `.github/workflows/deploy-root.yml` runs `npm run build:pages` and commits them, and merging deploys. See `CLAUDE.md` for architecture and coding rules.

## Testing the security rules (emulator)

`npm run test:rules` runs `rules-tests/` against `firebase-rules.json` on the local Firebase Realtime Database emulator (project `demo-familyflow`, no real project or network to production). It needs Java 11+ for the emulator; the normal `npm test` does not. CI runs it as the `rules-tests` job.
