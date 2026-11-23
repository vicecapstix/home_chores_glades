// #398: ?readonly=1&member=<name> shows one member's chores on the TV/tablet. Display only; Firebase never touched.
import { describe, it, expect, vi, beforeEach } from 'vitest';

async function loadConfig(search) {
  vi.resetModules();
  window.history.pushState({}, '', '/' + search);
  return import('../src/config.js');
}

describe('TV_MEMBER URL param (#398)', () => {
  it('reads member with cycle=1 and text= alongside', async () => {
    const c = await loadConfig('?readonly=1&member=Bo&cycle=1&text=large');
    expect(c.TV_MEMBER).toBe('Bo'); expect(c.TV_CYCLE).toBe(true);
  });
  it('is empty without readonly=1', async () => {
    expect((await loadConfig('?member=Bo')).TV_MEMBER).toBe('');
  });
  it('is trimmed and capped', async () => {
    expect((await loadConfig('?readonly=1&member=%20Bo%20')).TV_MEMBER).toBe('Bo');
    expect((await loadConfig('?readonly=1&member=' + 'x'.repeat(200))).TV_MEMBER.length).toBe(60);
  });
});

describe('tvMember / tvMemberTasks', () => {
  let tv;
  const members = { Bo: { name: 'Bo' }, Cy: { name: 'Cy' }, '<b>X</b>': { name: '<b>X</b>' } };
  beforeEach(async () => { vi.resetModules(); window.history.pushState({}, '', '/'); tv = await import('../src/tv.js'); });
  it('matches exact, then case-insensitively; unknown or empty gives full board', () => {
    expect(tv.tvMember(members, 'Bo')).toBe('Bo');
    expect(tv.tvMember(members, 'bo')).toBe('Bo');
    expect(tv.tvMember(members, 'Zed')).toBe('');
    expect(tv.tvMember(members, '')).toBe('');
    expect(tv.tvMember({}, 'Bo')).toBe('');
  });
  it('keeps that member\'s chores and Anyone chores only', () => {
    const tasks = { a: { id: 'a', person: 'Bo' }, b: { id: 'b', person: 'Cy' }, c: { id: 'c', person: '' } };
    expect(tv.tvMemberTasks(Object.values(tasks), 'Bo').map(t => t.id)).toEqual(['a', 'c']);
    expect(tv.tvMemberTasks(Object.values(tasks), '').map(t => t.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('render on the readonly tablet (#398)', () => {
  async function setup(member) {
    vi.resetModules();
    vi.doMock('../src/config.js', async orig => ({ ...(await orig()), READONLY: true, TV_MEMBER: member }));
    const { state } = await import('../src/state.js');
    state.members = { Bo: { name: 'Bo', weekPoints: 4, weekStart: (await import('../src/utils.js')).getWeekStart(), streak: 0 }, Cy: { name: 'Cy', weekPoints: 9, weekStart: (await import('../src/utils.js')).getWeekStart(), streak: 0 } };
    state.tasks = {
      a: { id: 'a', name: 'Bo job', freq: 'daily', person: 'Bo', done: false, lastDone: 0, subtasks: {} },
      b: { id: 'b', name: 'Cy job', freq: 'daily', person: 'Cy', done: false, lastDone: 0, subtasks: {} },
      c: { id: 'c', name: 'Anyone job', freq: 'daily', person: '', done: false, lastDone: 0, subtasks: {} },
    };
    document.body.innerHTML = '<div id="tv-strip"></div><div id="task-list"></div>';
    const tv = await import('../src/tv.js');
    return { state, tv };
  }
  it('strip shows only that member (name, points) and escapes it', async () => {
    const { tv } = await setup('bo');
    tv.renderTvStrip();
    const html = document.getElementById('tv-strip').innerHTML;
    expect(html).toContain('Bo'); expect(html).toContain('<b>4</b>');
    expect(html).not.toContain('Cy');
  });
  it('escapes a member name containing HTML and ignores a URL-only name', async () => {
    const { state, tv } = await setup('<b>X</b>');
    state.members['<b>X</b>'] = { name: '<b>X</b>', weekPoints: 1, weekStart: (await import('../src/utils.js')).getWeekStart(), streak: 0 };
    tv.renderTvStrip();
    const html = document.getElementById('tv-strip').innerHTML;
    expect(html).toContain('&lt;b&gt;X&lt;/b&gt;'); expect(html).not.toContain('<b>X</b>');
    delete state.members['<b>X</b>'];
    tv.renderTvStrip();
    expect(document.getElementById('tv-strip').innerHTML).not.toContain('<b>X</b>');
  });
  it('the evening Tomorrow panel only lists that member and Anyone', async () => {
    const { state, tv } = await setup('Bo');
    document.body.innerHTML += '<div id="tv-tomorrow"></div>';
    state.tasks = {
      a: { id: 'a', name: 'Bo job', freq: 'daily', person: 'Bo', done: false, lastDone: 0, subtasks: {} },
      b: { id: 'b', name: 'Cy job', freq: 'daily', person: 'Cy', done: false, lastDone: 0, subtasks: {} },
      c: { id: 'c', name: 'Anyone job', freq: 'daily', person: '', done: false, lastDone: 0, subtasks: {} },
    };
    tv.renderTvTomorrow(new Date(2026, 10, 23, 19, 0).getTime());
    const html = document.getElementById('tv-tomorrow').innerHTML;
    expect(html).toContain('Bo job'); expect(html).toContain('Anyone job'); expect(html).not.toContain('Cy job');
  });
  it('unknown name falls back to the full strip', async () => {
    const { tv } = await setup('Nobody');
    tv.renderTvStrip();
    const html = document.getElementById('tv-strip').innerHTML;
    expect(html).toContain('Bo'); expect(html).toContain('Cy');
  });
  it('the visible chore list follows the member', async () => {
    const { state } = await setup('Bo');
    const { visibleTasks } = await import('../src/render.js');
    expect(visibleTasks().map(t => t.name).sort()).toEqual(['Anyone job', 'Bo job']);
    state.members = {};
    expect(visibleTasks().length).toBe(3);
  });
  it('is ignored outside the readonly view', async () => {
    vi.resetModules();
    vi.doMock('../src/config.js', async orig => ({ ...(await orig()), READONLY: false, TV_MEMBER: 'Bo' }));
    const { state } = await import('../src/state.js');
    state.members = { Bo: { name: 'Bo' } };
    state.tasks = { a: { id: 'a', name: 'A', person: 'Cy', freq: 'daily', done: false }, b: { id: 'b', name: 'B', person: 'Bo', freq: 'daily', done: false } };
    const { visibleTasks } = await import('../src/render.js');
    expect(visibleTasks().length).toBe(2);
  });
});
