# Forgotten PINs & Resetting FamilyFlow

Login is **per member**: each member picks their name and, if one is set, enters their own 4-digit PIN. There is no house/master PIN any more (removed in #23). PINs are stored as SHA-256 hashes in `/state/members/<Name>/pinHash`; an empty `pinHash` means "no PIN" and the member just taps their name.

---

## I forgot my PIN

### Option 1 — another admin resets it (easiest)

1. The other admin logs in and opens **Admin Panel**.
2. Find your name → **Set PIN** → enter a new 4-digit PIN.

### Option 2 — you are the only admin (Firebase Console)

1. Open [Firebase Console](https://console.firebase.google.com/) → your project → **Realtime Database**.
2. Go to `/state/members/<YourName>/pinHash`.
3. Either set it to an empty string `""` (no PIN), or paste the hash of a new PIN (see below).
4. Reload the site, tap your name, then use **Admin Panel → Set PIN** to choose a new PIN if you cleared it.

To get the hash of a new 4-digit PIN, run this in a browser console (F12 → Console):

```js
crypto.subtle.digest('SHA-256', new TextEncoder().encode('1234'))
  .then(b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''))
  .then(hash => console.log(hash));
```

Replace `1234` with the PIN you want and copy the printed hex string.

---

## Starting over (wipe everything)

This deletes all members, tasks, history, templates, rewards and redemptions. There is no in-app reset button.

1. **Back up first.** Firebase Console → **Realtime Database → Data** → three-dot menu (top right) → **Export JSON**. Keep the file; to restore, use **Import JSON** on the same menu.
2. Hover the `state` node → three-dot menu → **Delete**. Leave `admins` alone if it exists (it holds the parent UIDs, not family data).
3. Reload the site on every device (on phones with the app installed, close and reopen it).
4. With zero members the app is in setup mode: add the first member, who becomes **admin**. Once `/admins` exists, only a signed-in parent is admin, so sign in with **Parent sign in** first.
5. Add the rest of the family, then set PINs from **Admin Panel → Set PIN**.

Note: the rules require `nextId` under `/state` (see `CLAUDE.md`). The first write after the wipe (adding a member) recreates it.

---

## Security notes

- Client-side PINs are a convenience, not strong security: hashes are readable by anyone who can read the database.
- Use a 4-digit PIN you don't reuse elsewhere.
- For sensitive households, consider restricting Firebase rules to authenticated users.
