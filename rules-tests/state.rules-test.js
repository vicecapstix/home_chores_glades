// Security-rules tests for firebase-rules.json, run against the LOCAL RTDB emulator only
// (demo-familyflow project: no real project, no production network). See `npm run test:rules`.
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

let env;
const validState = () => ({ nextId: 1, members: { Alice: { name: 'Alice', role: 'admin' } } });

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-familyflow',
    database: { rules: readFileSync('firebase-rules.json', 'utf8') },
  });
});
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearDatabase();
  await env.withSecurityRulesDisabled(async (ctx) => { await ctx.database().ref('state').set(validState()); });
});

const anon = () => env.unauthenticatedContext().database();
const authed = () => env.authenticatedContext('uid1').database();

describe('/admins (#97)', () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.database().ref('admins').set({ parentUid: 'Alice' }); });
  });
  it('is readable by signed-in users but not by anonymous-less clients', async () => {
    await assertSucceeds(authed().ref('admins').get());
    await assertFails(anon().ref('admins').get());
  });
  it('is not writable by any client, including a listed admin', async () => {
    await assertFails(authed().ref('admins/uid1').set('Bob'));
    await assertFails(authed().ref('admins').set({ uid1: 'Bob' }));
    await assertFails(env.authenticatedContext('parentUid').database().ref('admins/parentUid').remove());
    await assertFails(anon().ref('admins/x').set('Bob'));
  });
});

describe('firebase-rules.json on the emulator', () => {
  it('denies unauthenticated read and write of /state', async () => {
    await assertFails(anon().ref('state').get());
    await assertFails(anon().ref('state/nextId').set(2));
  });
  it('allows authenticated read of /state', async () => {
    await assertSucceeds(authed().ref('state').get());
  });
  it('denies read and write anywhere outside /state, even when authenticated', async () => {
    await assertFails(authed().ref('other').get());
    await assertFails(authed().ref('other').set({ a: 1 }));
  });
  it('rejects a whole-state write that lacks nextId', async () => {
    await assertFails(authed().ref('state').set({ members: { Alice: { name: 'Alice', role: 'admin' } } }));
  });
  it('accepts a whole-state write that has a numeric nextId', async () => {
    await assertSucceeds(authed().ref('state').set(validState()));
  });
  it('rejects a non-numeric nextId', async () => {
    await assertFails(authed().ref('state/nextId').set('abc'));
  });
  it('rejects an invalid member role', async () => {
    await assertFails(authed().ref('state/members/Bob').set({ name: 'Bob', role: 'owner' }));
    await assertSucceeds(authed().ref('state/members/Bob').set({ name: 'Bob', role: 'member' }));
  });
  it('accepts a bonus history entry (has taskName + person) and rejects one without taskName (#183)', async () => {
    const bonus = { type: 'bonus', taskName: 'Bonus: Helped', reason: 'Helped', person: 'Alice', points: 5, completedAt: 1 };
    await assertSucceeds(authed().ref('state/history/0').set(bonus));
    const { taskName, ...legacy } = bonus;
    await assertFails(authed().ref('state/history/1').set(legacy));
  });
  it('keeps the history cap at 500 entries (index 499 ok, 500 rejected)', async () => {
    const entry = { taskName: 't', person: 'Alice' };
    await assertSucceeds(authed().ref('state/history/499').set(entry));
    await assertFails(authed().ref('state/history/500').set(entry));
  });
});
