import { setPauseUntil, setAwayMembers } from './utils.js';
import { PCOLS } from './config.js';

// Central mutable state — all modules import this object directly.
// Mutations are visible to all importers since objects are passed by reference.
export const state = {
  members:   {},
  tasks:     {},
  history:   [],
  nextId:    1,
  templates: {},
  rewards:   {},
  redemptions: {},
  claims:    {}, // pending extra-job claims (#224)
  pause:     null,
  teamGoal:  null, // { points, reward } weekly family goal (#174)
  admins:    null, // /admins {uid: memberName}; null until it exists (role fallback)
  uid:       null, // current Firebase Auth UID
  parentEmail: false, // true when signed in with an email account
};

// Derived convenience accessor — always computed fresh from state.members
export function getMembers() {
  return Object.values(state.members).map(m => m.name);
}

// Stable member colour (#166): the stored colorIdx wins; members without one fall back to
// their position in `names` (the old behaviour) until an admin backfills them.
export function memberColor(name, names = getMembers()) {
  const m = state.members[name];
  if (m && Number.isInteger(m.colorIdx) && m.colorIdx >= 0) return PCOLS[m.colorIdx % PCOLS.length];
  const i = names.indexOf(name);
  return i >= 0 ? PCOLS[i % PCOLS.length] : null;
}

// Least-used colour index among current members (lowest wins ties) for a new member.
export function nextColorIdx(members = state.members) {
  const names = Object.values(members).map(m => m.name);
  const counts = PCOLS.map(() => 0);
  names.forEach((n, i) => {
    const m = members[n] || {};
    counts[(Number.isInteger(m.colorIdx) ? m.colorIdx : i) % PCOLS.length]++;
  });
  return counts.indexOf(Math.min(...counts));
}

// Apply a Firebase snapshot to state (called from onValue listener)
export function applySnapshot(val) {
  state.members   = val.members   || {};
  state.tasks     = val.tasks     || {};
  state.history   = val.history   || [];
  state.nextId    = val.nextId    || 1;
  state.templates = val.templates || {};
  state.rewards   = val.rewards   || {};
  state.redemptions = val.redemptions || {};
  state.claims = val.claims || {};
  state.pause = val.pause && val.pause.until ? val.pause : null;
  setAwayMembers(state.members);
  state.teamGoal = val.teamGoal && val.teamGoal.points ? val.teamGoal : null;
  setPauseUntil(state.pause ? state.pause.until : '');
}

// Migrate legacy members array ["Alice","Bob"] → object format
export function migrateLegacyMembers(raw) {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const obj = {};
    raw.forEach((name, i) => {
      if (name) obj[name] = {
        name, role: i === 0 ? 'admin' : 'member',
        pinHash: '', points: 0, streak: 0, lastStreakDate: null,
        badges: [], completedCount: 0, weekPoints: 0, weekStart: null,
      };
    });
    return obj;
  }
  // Already object format — fill in any missing fields
  const obj = {};
  Object.values(raw).forEach((m, i) => {
    if (!m || !m.name) return;
    obj[m.name] = {
      points: 0, streak: 0, lastStreakDate: null, badges: [],
      completedCount: 0, weekPoints: 0, weekStart: null, role: 'member', pinHash: '',
      ...m,
    };
    if (i === 0 && !m.role) obj[m.name].role = 'admin';
  });
  return obj;
}
