import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');
const read = f => readFileSync(resolve(root, f), 'utf8');

describe('docs stay in step with the code (#39)', () => {
  const readme = read('README.md');
  const claude = read('CLAUDE.md');
  it('README uses the FamilyFlow name and the real FB_URL location', () => {
    expect(readme.startsWith('# FamilyFlow')).toBe(true);
    expect(readme).toContain('src/config.js');
    expect(readme).not.toMatch(/no build step/i);
    expect(readme).not.toMatch(/CORRECT_HASH/);
  });
  it('README documents the npm workflow', () => {
    for (const c of ['npm ci', 'npm run dev', 'npm test', 'npm run build:pages']) expect(readme).toContain(c);
  });
  it('CLAUDE.md names every src module and says dist/ is git-ignored', () => {
    for (const f of readdirSync(resolve(root, 'src')).filter(n => n.endsWith('.js'))) expect(claude).toContain(f);
    expect(claude).toMatch(/dist\/.*git-ignored/);
  });
});

describe('README and CLAUDE.md match the current code (#223)', () => {
  const readme = read('README.md');
  const claude = read('CLAUDE.md');
  const src = f => read('src/' + f);

  it('README filter row lists the real status pills', () => {
    const labels = [...src('render.js').matchAll(/\{ k: '\w+',\s*label: '([^']+)' \}/g)].map(m => m[1]);
    expect(labels).toEqual(['Mine', 'All', 'Pending', 'Overdue', 'Done']);
    const row = readme.split('\n').find(l => l.startsWith('| Filter tasks'));
    expect(row).toBeTruthy();
    for (const l of labels) expect(row).toContain(l);
    expect(row).not.toContain('Done today');
  });

  it('README feature list covers Every N days, skip, pause, away, ± Points and saving goal', () => {
    for (const s of ['Every N days', 'Skip', 'Pause', 'Away', '± Points', 'Saving goal']) expect(readme).toContain(s);
  });

  it('CLAUDE.md task data shape lists every task field written by src/', () => {
    const shape = claude.split('### Task data shape')[1].split('### Member data shape')[0];
    const tasks = src('tasks.js');
    const fields = new Set([
      ...[...tasks.matchAll(/taskUpdate\.(\w+)\s*=/g)].map(m => m[1]),
      ...[...tasks.matchAll(/\[p \+ '(\w+)'\]/g)].map(m => m[1]),
      'skippedAt', 'intervalDays', 'rotation',
    ]);
    for (const f of fields) expect(shape, f).toMatch(new RegExp('^\\s*' + f + '\\b', 'm'));
    expect(shape).toContain("'interval'");
  });

  it('CLAUDE.md member shape lists the extra member fields and /state lists pause', () => {
    const shape = claude.split('### Member data shape')[1].split('###')[0];
    for (const f of ['colorIdx', 'avatar', 'awayUntil', 'awaySince', 'goalRewardId']) expect(shape, f).toMatch(new RegExp('^\\s*' + f + '\\b', 'm'));
    for (const b of ['getting_started', 'tenacious', 'half_century', 'consistent']) expect(shape).toContain(b);
    expect(claude).toMatch(/^\s*pause:/m);
  });
});

describe('README lists features merged 25–27 Oct (#254)', () => {
  const readme = read('README.md');
  const features = readme.split('## Features')[1].split('\n## ')[0];
  it('mentions TV auto-cycle, reward limits, due-time reminders, To give, card points, tied ranks and reward history', () => {
    for (const s of ['cycle=1', 'per week', 'Due-time reminders', 'To give', 'Given ✓', 'on each chore card', 'share a rank']) expect(features, s).toContain(s);
    const hist = features.split('\n').find(l => l.includes('**Activity history**'));
    expect(hist).toMatch(/reward requests/);
    expect(hist).toMatch(/refunds/);
  });
});
