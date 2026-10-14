# Spec — #48 'Mine' view + notifications only for my tasks
Behaviour: logged-in members (incl. admins) get a "Mine" filter pill = chores assigned to me or unclaimed, excluding future ('ok'/on-track) ones. It is the default on phones (<=700px) the first time the list renders after login; users can switch to All/other filters. Overdue browser notifications are sent only for not-done overdue chores assigned to the current member (none if nobody is logged in / readonly). The permission prompt no longer fires automatically; a bell button (`#btn-notify`, hidden when unsupported/granted/denied/readonly) asks on click (user gesture).
UI states: admin & member — Mine pill + bell; readonly TV — neither (no member). Admin still sees all tasks under All.
Data shape: none. No writes. RBAC: display filter only (not a security boundary). Cost: none; in-tab Notification API only, no push service.
Concerns: in-tab notifications work only while the tab/PWA is open (documented limitation).
