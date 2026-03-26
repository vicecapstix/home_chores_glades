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
- **Badges** — First Chore, Century, On Fire (7-day streak), Dedicated (30-day streak)
- **Templates** — save the current task list as a reusable template
- **Stats** — completion charts by week, month, or all time; export to CSV
- **Browser notifications** — get an alert when a chore goes overdue (requires permission)
- **Bulk actions** — select multiple tasks to bulk-assign or bulk-delete
- **Daily summary** — on first visit each day, shows what's overdue or due soon
- **PIN protection** — 6-digit family PIN with lockout after 5 failed attempts
- **Progress header** — live count of total, done, overdue, and completion %

## Setup

### 1. Firebase Realtime Database

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project
2. Enable **Realtime Database** (Asia Southeast or your preferred region)
3. Copy the database URL and update `FB_URL` in `index.html`:
   ```js
   const FB_URL = 'https://your-project-default-rtdb.region.firebasedatabase.app';
   ```
4. Set the database rules (**Realtime Database → Rules**):
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

### 2. GitHub Pages

1. Push `index.html` (and these docs) to your repository's `main` branch
2. Go to **Settings → Pages** and set source to `main` / `/ (root)`
3. Your app will be live at `https://<username>.github.io/<repo>/`

### 3. Changing the house PIN

The house PIN is a 6-digit code required to open the app. To set a new one, run this in your browser console (replace `123456` with your desired PIN):

```js
crypto.subtle.digest('SHA-256', new TextEncoder().encode('123456'))
  .then(b => console.log(Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2,'0')).join('')))
```

Then replace `CORRECT_HASH` in `index.html` (~line 502) with the output.

### 4. Setting per-member PINs

Each member can have their own 4-digit PIN. To set or update a member's PIN, open the app in your browser, open the developer console, and run:

```js
// Replace "Alice" and "1234" with the member name and desired PIN
crypto.subtle.digest('SHA-256', new TextEncoder().encode('1234'))
  .then(b => b = Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join(''))
  .then(hash => {
    const { getDatabase, ref, update } = window.__firebaseDB || {};
    // Or use the Firebase REST API:
    fetch('<YOUR_DB_URL>/state/members/Alice.json', {
      method: 'PATCH',
      body: JSON.stringify({ pinHash: hash })
    });
  });
```

If a member has no PIN set (`pinHash` is empty), they can log in by just tapping their name.

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
