// Shared "may we write?" flag (#216). False while cached data is showing, until the first live
// snapshot. Kept apart from firebase.js so entry points can check it without importing the SDK.
let live = true;
export const CONNECTING_MSG = 'Still connecting — try again in a moment';
export const isLive = () => live;
export const setLive = v => { live = !!v; };
// Entry-point guard: shows the message and returns true when writes are not possible yet.
export function writeBlocked(toast) { if (live) return false; toast(CONNECTING_MSG); return true; }
