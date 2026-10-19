import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { setupEnv, baseState, seed } from './helpers.js';

let env;
beforeAll(async () => { env = await setupEnv(); });
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearDatabase();
  await seed(env, 'state', baseState());
});

const anon = () => env.unauthenticatedContext().database();
const user = () => env.authenticatedContext('kid-uid').database();

describe('unauthenticated clients (raw REST / bots)', () => {
  it('cannot read /state', async () => { await assertFails(anon().ref('state').get()); });
  it('cannot write /state', async () => { await assertFails(anon().ref('state').set(baseState())); });
  it('cannot patch a task', async () => { await assertFails(anon().ref('state/tasks/t1/done').set(true)); });
  it('cannot read the database root', async () => { await assertFails(anon().ref('/').get()); });
});

describe('signed-in clients', () => {
  it('can read /state', async () => { await assertSucceeds(user().ref('state').get()); });
  it('cannot read or write outside /state', async () => {
    await assertFails(user().ref('other').get());
    await assertFails(user().ref('other').set(1));
  });
  it('can write a full state that has nextId', async () => {
    await assertSucceeds(user().ref('state').set(baseState({ nextId: 2 })));
  });
  it('can patch a single task field', async () => {
    await assertSucceeds(user().ref('state/tasks/t1/done').set(true));
  });
});

describe('nextId validate', () => {
  it('rejects a full state write without nextId', async () => {
    const { nextId, ...noId } = baseState();
    await assertFails(user().ref('state').set(noId));
  });
  it('rejects a non-number nextId', async () => {
    await assertFails(user().ref('state/nextId').set('7'));
  });
  it('rejects deleting nextId', async () => {
    await assertFails(user().ref('state/nextId').remove());
  });
  it('allows empty members and tasks (RTDB drops them to null)', async () => {
    await assertSucceeds(user().ref('state').set({ nextId: 1 }));
  });
});

describe('shape checks', () => {
  it('rejects an unknown freq', async () => {
    await assertFails(user().ref('state/tasks/t1/freq').set('hourly'));
  });
  it('rejects a bad role', async () => {
    await assertFails(user().ref('state/members/Alice/role').set('owner'));
  });
  it('rejects history index 500 (cap) and accepts 499', async () => {
    const h = { taskName: 'Dishes', person: 'Alice' };
    await assertSucceeds(user().ref('state/history/499').set(h));
    await assertFails(user().ref('state/history/500').set(h));
  });
});
