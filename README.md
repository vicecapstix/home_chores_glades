# FamilyChores

A real-time chore tracker for families — assign tasks, track frequencies, and stay on top of what needs doing. Live across all devices via Firebase.

## Features

- **Real-time sync** — changes appear instantly on every device
- **Family members** — add colour-coded member chips; assign chores to specific people
- **Chore frequencies** — daily, weekly, fortnightly, or monthly
- **Status tracking** — overdue, due soon, on track, and done today sections
- **Inline editing** — edit a task's name, frequency, or assignee without deleting it
- **PIN protection** — 6-digit PIN with lockout after 5 failed attempts
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

### 3. Changing the PIN

The default PIN is hashed. To set a new one, run this in your browser console (replace `123456` with your PIN):

```js
crypto.subtle.digest('SHA-256', new TextEncoder().encode('123456'))
  .then(b => console.log(Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2,'0')).join('')))
```

Then replace `CORRECT_HASH` in `index.html` with the output.

## Usage

| Action | How |
|---|---|
| Add a family member | Type name in the members bar → **+ Add** (or Enter) |
| Remove a member | Click **×** on their chip |
| Add a chore | Fill in the add bar → **+ Add chore** |
| Edit a chore | Hover the card → click **✎** |
| Mark done | Click the checkbox on the left |
| Delete a chore | Hover the card → click **×** |
| Filter tasks | Use the pill buttons (All / Pending / Overdue / Done today) |

## Tech

- Vanilla HTML/CSS/JS — no framework, no build step
- [Firebase Realtime Database](https://firebase.google.com/docs/database) for live sync
- Hosted on GitHub Pages
