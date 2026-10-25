# Spec: #178 Install app button and home-screen shortcuts

## Behaviour
- `src/install.js` captures `beforeinstallprompt` (preventDefault, keep the event). A header "Install" button (`#btn-install`) appears while a prompt is available and the app is not already installed; clicking calls `prompt()`. It hides after the choice, on `appinstalled`, and never shows in `display-mode: standalone` (or iOS `navigator.standalone`).
- iOS Safari has no prompt event: a one-time banner `#ios-install-hint` says "tap Share, then Add to Home Screen" with a "Got it" button; dismissal is stored in localStorage `fc_ios_hint`.
- `manifest.webmanifest` gets `shortcuts`: "My chores" (`./?view=mine`) and "TV view" (`./?readonly=1`).
- `?view=mine` makes the first render of a signed-in member use the Mine filter (same hook as the existing phone default; `viewFromSearch` in utils.js).

## UI states
- Admin / member: button or hint shown when applicable.
- Readonly TV: `initInstall` returns early and CSS also hides both elements; no install UI on TV.

## /state data changes
None.

## RBAC
No database writes. `installApp` is also guarded by `READONLY`.

## Cost guardrails
Manifest and client code only; no services, keys or deps. No Firebase usage.

## Concerns
- `beforeinstallprompt` is Chromium-only; Safari desktop/Firefox show nothing (acceptable).
- Manifest shortcuts only take effect after the app is (re)installed on the device.
- `?view=mine` needs a signed-in member; with no member it falls back to All.
