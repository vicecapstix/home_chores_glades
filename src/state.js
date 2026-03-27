// Central mutable state — all modules import this object directly.
// Mutations are visible to all importers since objects are passed by reference.
export const state = {
  members:   {},
  tasks:     {},
  history:   [],
  nextId:    1,
  templates: {},
};

// Derived convenience accessor — always computed fresh from state.members
export function getMembers() {
  return Object.values(state.members).map(m => m.name);
}

// Apply a Firebase snapshot to state (called from onValue listener)
export function applySnapshot(val) {
  state.members   = val.members   || {};
  state.tasks     = val.tasks     || {};
  state.history   = val.history   || [];
  state.nextId    = val.nextId    || 1;
  state.templates = val.templates || {};
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
