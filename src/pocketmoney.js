// Pocket money (#229): display-only conversion of points to cash plus a payout log.
// state/pocketMoney = {pts, amount}; absent = feature off. Never changes points.
// Payouts live at members/<name>/payouts/p<at> = {at, by, points}, newest 52 kept.
import { state } from './state.js';
import { READONLY } from './config.js';
import { patchRoot, patchPaths } from './firebase.js';
import { showToast } from './ui.js';
import { pushUndo } from './undo.js';
import { esc, jsq, num, payoutList } from './utils.js';

export const PAYOUT_CAP = 52;
let _busy = false;

// Pure: {pts, amount} or null. pts whole 1-1000, amount 0.01-1000 with at most 2 decimals.
export function validRate(pts, amount) {
  const p = Number(pts);
  const aStr = String(amount == null ? '' : amount).trim();
  const a = Number(aStr);
  if (!Number.isInteger(p) || p < 1 || p > 1000) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(aStr) || !(a >= 0.01 && a <= 1000)) return null;
  return { pts: p, amount: a };
}

// Pure: points since the last payout, and the amount owed in cents (floored, never negative).
export function owed(member, rate = state.pocketMoney) {
  const list = payoutList(member);
  const last = list.length ? num(list[list.length - 1].points) : 0;
  const pts = Math.max(0, num(member && member.points) - last);
  const r = rate && validRate(rate.pts, rate.amount);
  const cents = r ? Math.floor(pts * Math.round(r.amount * 100) / r.pts) : 0;
  return { pts, cents };
}

export const money = cents => '$' + (cents / 100).toFixed(2);

// Chip / TV text. '' when the feature is off.
export function owedHTML(member, rate = state.pocketMoney) {
  if (!rate || !validRate(rate.pts, rate.amount)) return '';
  const o = owed(member, rate);
  return ' <span class="chip-owed" title="Pocket money owed">' + esc(money(o.cents)) + ' (' + esc(String(o.pts)) + ' pts)</span>';
}

export async function setPocketMoney(pts, amount, isAdminFn) {
  if (READONLY || !isAdminFn()) return false;
  const v = validRate(pts, amount);
  if (!v) { showToast('Use whole points 1-1000 and an amount from 0.01 to 1000'); return false; }
  try { await patchRoot({ pocketMoney: v }); state.pocketMoney = v; showToast('Pocket money rate saved'); return true; }
  catch (err) { showToast('Save failed: ' + (err.code || err.message)); return false; }
}

export async function clearPocketMoney(isAdminFn) {
  if (READONLY || !isAdminFn()) return false;
  try { await patchRoot({ pocketMoney: null }); state.pocketMoney = null; showToast('Pocket money turned off'); return true; }
  catch (err) { showToast('Save failed: ' + (err.code || err.message)); return false; }
}

const keyOf = p => 'p' + p.at;

// Admin only. Records {at, by, points}; undo removes exactly that entry (and restores any dropped by the cap).
export async function markPaid(name, isAdminFn, currentMemberFn) {
  if (READONLY || !isAdminFn()) return false;
  const m = state.members[name];
  if (!m || !state.pocketMoney || _busy) return false;
  _busy = true;
  try {
    const at = Date.now();
    const entry = { at, by: currentMemberFn() || '', points: num(m.points) };
    const base = 'members/' + name + '/payouts/';
    const list = payoutList(m);
    const dropped = list.slice(0, Math.max(0, list.length + 1 - PAYOUT_CAP));
    const paths = { [base + keyOf(entry)]: entry };
    dropped.forEach(p => { paths[base + keyOf(p)] = null; });
    const due = owed(m).cents;
    await patchPaths(paths);
    m.payouts = Object.fromEntries([...list.slice(dropped.length), entry].map(p => [keyOf(p), p]));
    showToast('Marked paid: ' + money(due));
    pushUndo({
      label: 'Paid ' + name, verb: 'Recorded',
      undo: async () => {
        const back = { [base + keyOf(entry)]: null };
        dropped.forEach(p => { back[base + keyOf(p)] = p; });
        await patchPaths(back);
      },
    });
    return true;
  } catch (err) {
    showToast('Could not record payout: ' + (err.code || err.message));
    return false;
  } finally { _busy = false; }
}

export function pocketMoneyAdminHTML() {
  const r = state.pocketMoney;
  return '<div class="pause-admin"><div><b>Pocket money</b> (display only)</div>' +
    '<label for="pm-pts" class="sr-only">Points</label>' +
    '<input type="number" id="pm-pts" min="1" max="1000" step="1" style="width:5em" value="' + esc(r ? r.pts : '10') + '" /> pts = $' +
    '<label for="pm-amount" class="sr-only">Amount</label>' +
    '<input type="number" id="pm-amount" min="0.01" max="1000" step="0.01" style="width:5em" value="' + esc(r ? r.amount : '1') + '" />' +
    '<button class="btn-sm" onclick="window.setPocketMoney()">Set</button>' +
    (r ? '<button class="btn-sm" onclick="window.clearPocketMoney()">Off</button>' : '') + '</div>';
}

export function markPaidButtonHTML(name) {
  if (!state.pocketMoney) return '';
  return '<button class="btn-sm" aria-label="Mark ' + esc(name) + ' paid" onclick="window.markPaid(\'' + jsq(name) + '\')">Mark paid</button>';
}
