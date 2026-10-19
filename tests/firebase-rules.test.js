import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const rules = JSON.parse(readFileSync('firebase-rules.json', 'utf8')).rules;
const readme = readFileSync('README.md', 'utf8');

describe('firebase-rules.json draft (#41, not deployed by agents)', () => {
  it('requires auth for read and write on /state, nothing open at root', () => {
    expect(rules['.read'] === true || rules['.write'] === true).toBe(false);
    expect(rules.state['.read']).toBe('auth != null');
    expect(rules.state['.write']).toBe('auth != null');
  });
  it('keeps the nextId validate (empty lists are null in RTDB)', () => {
    expect(rules.state['.validate']).toBe("newData.hasChild('nextId')");
  });
  it('validates the shape of members, tasks, history', () => {
    expect(rules.state.members.$name['.validate']).toMatch(/hasChildren/);
    expect(rules.state.members.$name.role['.validate']).toMatch(/admin/);
    expect(rules.state.tasks.$id['.validate']).toMatch(/hasChildren/);
    expect(rules.state.tasks.$id.freq['.validate']).toMatch(/weekdays/);
    expect(rules.state.history.$i['.validate']).toMatch(/matches/);
  });
  it('history index regex allows 0..499 only (keeps the 500 cap)', () => {
    const m = rules.state.history.$i['.validate'].match(/matches\(\/(.+?)\/\)/);
    const re = new RegExp(m[1]);
    for (const ok of ['0', '9', '10', '99', '100', '499']) expect(re.test(ok)).toBe(true);
    for (const bad of ['500', '999', '1000', '01', 'a', '-1']) expect(re.test(bad)).toBe(false);
  });
  it('README documents the Console steps and the rules file', () => {
    expect(readme).toMatch(/firebase-rules\.json/);
    expect(readme).toMatch(/Anonymous/);
    expect(readme).toMatch(/Rules Playground/);
  });
});
