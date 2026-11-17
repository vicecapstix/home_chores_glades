# Spec: text size setting (#356)

**Behaviour:** a header button "A / A+ / A++" cycles Normal, Large (115%), Extra large (130%). It sets `ts-large` / `ts-xl` on `<html>`, which scales the root font size, so every rem-based size follows (body now uses `1rem`). Saved per device in localStorage `fc_textsize` (try/catch; missing, blocked or unknown value means Normal). `?text=large` (also `xl`, `xlarge`, `extra-large`, `normal`) applies on load and beats the saved value; it is not stored, so a TV URL keeps working without a tap.

**UI states:** admin, member and readonly TV all see the button (device-local, no write). TV: set via URL param, button also usable with a remote.

**Data shape:** none. Nothing in /state, nothing sent anywhere. `src/restore.js` and member rename untouched.

**Security/RBAC:** no write path, no user data in HTML. URL value is looked up in a fixed map.

**Cost guardrails:** no reads/writes, no services, no dependencies.

**Concerns:** layouts checked for horizontal overflow at 360px and 1280px (Extra large, empty-data load) with a headless browser; a populated board on a real phone/TV is worth a quick look (see PR).
