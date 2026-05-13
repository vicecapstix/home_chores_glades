# Resetting FamilyFlow & Managing the Master PIN

## Overview

FamilyFlow has a **6-digit master PIN** that gives emergency admin access without needing any member account. It is used to:

- Bootstrap the site from scratch (add the first admin member)
- Access the admin panel from any device if you forget your member PIN

---

## Default master PIN

The default master PIN shipped with this repository is **`000000`**.

**Change this before sharing the URL with anyone** — see [Changing the master PIN](#changing-the-master-pin) below.

---

## Resetting the site to default

Resetting wipes all members, tasks, and history from Firebase and returns the site to a blank state. The master PIN in the code is unaffected.

### Via the Admin Panel (recommended)

1. Open the site and log in as an **admin** member (or use the master PIN — see below).
2. Click the **Admin** button in the header.
3. Scroll to the bottom of the Admin Panel and click **Reset site to default**.
4. Confirm the dialog.

The page reloads and shows the login screen with no members.

### Manual Firebase reset (if locked out)

1. Go to [Firebase Console](https://console.firebase.google.com/) → your project → **Realtime Database**.
2. Navigate to the `/state` node.
3. Delete the entire `/state` node (hover → three-dot menu → **Delete**).
4. Reload the site.

---

## First login after a reset

After a reset the site has no members. Use the master PIN to create the first admin account:

1. On the login screen, click **🔑 Master PIN** (bottom of the card).
2. Enter the 6-digit master PIN.
3. A **"Welcome! Enter your name"** prompt appears — type the first admin's name and press **Next →**.
4. A 4-digit PIN pad appears — set a personal PIN for that member.
5. You are logged in automatically and the **Admin Panel** opens.

All subsequent users can be added from the Admin Panel (Members section on the main screen or **+ Add** button).

---

## Subsequent master PIN logins

If the site already has members, the master PIN bypasses member selection:

1. On the login screen, click **🔑 Master PIN**.
2. Enter the 6-digit master PIN.
3. You are logged in as the first admin member and the **Admin Panel** opens immediately.

---

## Changing the master PIN

The master PIN is stored as a SHA-256 hash in `index.html`. To change it:

**Step 1 — Generate the hash of your new PIN.**

Open a browser console (F12 → Console) on any page and run:

```js
crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOUR_NEW_PIN'))
  .then(b => console.log(
    Array.from(new Uint8Array(b))
      .map(x => x.toString(16).padStart(2, '0'))
      .join('')
  ));
```

Replace `YOUR_NEW_PIN` with your chosen 6-digit number (e.g. `'482951'`). Copy the hex string that appears.

**Step 2 — Update `index.html`.**

Find this line near the top of the `<script>` block (search for `CORRECT_HASH`):

```js
const CORRECT_HASH="91b4d142823f7d20c5f08df69122de43f35f057a988d9619f6d3138485c9a203",
```

Replace the hash value with the one you copied. The line should look like:

```js
const CORRECT_HASH="<your-new-hash>",
```

**Step 3 — Deploy.**

Commit and push to `main`. GitHub Pages will serve the updated file.

---

## Security notes

- The master PIN hash is visible in the page source. Use a PIN that is not reused elsewhere.
- After first setup, admins should set personal 4-digit member PINs via the Admin Panel.
- For sensitive households, consider restricting Firebase rules to authenticated users.
