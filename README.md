# FamilyChores

A real-time chore tracker for families — assign tasks, track progress, earn points, and stay on top of what needs doing. Live across all devices via Firebase.

## Features

- **Real-time sync** — changes appear instantly on every device
- **Family members** — colour-coded chips with points, streaks, and badges
- **Per-member login** — each member selects their name and enters their own 4-digit PIN
- **Roles** — first member is admin (can add/edit/delete); other members are read-only for tasks
- **Readonly view** — append `?readonly=1` to the URL for a TV-dashboard / guest view
- **Dark mode** — toggle with the moon/sun button in the header
- **Chore frequencies** — daily, weekly, fortnightly, or monthly
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
3. Copy the database URL and update `FB_URL` in `index.html`:
   ```js
   const FB_URL = 'https://your-project-default-rtdb.region.firebasedatabase.app';
   ```
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

`firebase-rules.json` in this repo is a **draft** that only lets signed-in clients read or write `/state` and checks the shape of members, tasks, history, rewards and redemptions. Nothing applies it automatically; you paste it yourself:

1. Firebase Console → **Authentication → Sign-in method** → enable **Anonymous**. (Free on the Spark plan. Until it is on, the app shows a toast saying so.)
2. Reload the app once so every device gets a token.
3. **Realtime Database → Rules**: paste the contents of `firebase-rules.json`, test a read and a write in the **Rules Playground** (authenticated), then **Publish**.
4. To roll back, paste the open rules from step 4 above and publish again.

Limit: anyone who opens the site gets an anonymous token, so PIN hashes stay readable from inside the app. These rules block raw REST/bot access without a token and malformed writes. After 5 wrong PINs a member's PIN pad locks for 5 minutes on that device (client-side only).

#### Testing the rules locally

`npm run test:rules` runs `tests/rules/` against the local Realtime Database emulator using a `demo-familyflow` project, so it never touches the live database. It needs Java 11+ (21 recommended). `npm test` doesn't run these and doesn't need Java. CI runs both.

### 2. GitHub Pages

1. Push `index.html` (and these docs) to your repository's `main` branch
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

- Vanilla HTML/CSS/JS — no framework, no build step
- [Firebase Realtime Database](https://firebase.google.com/docs/database) for live sync
- Hosted on GitHub Pages
