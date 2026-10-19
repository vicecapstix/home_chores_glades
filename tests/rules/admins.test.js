import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { setupEnv, baseState, seed } from './helpers.js';

let env;
beforeAll(async () => { env = await setupEnv(); });
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearDatabase();
  await seed(env, 'state', baseState());
  await seed(env, 'admins', { 'uid-jt': 'JT' });
});

const parent = () => env.authenticatedContext('uid-jt', { email: 'p@example.com', firebase: { sign_in_provider: 'password' } }).database();
const kid = () => env.authenticatedContext('kid-uid', { firebase: { sign_in_provider: 'anonymous' } }).database();

describe('/admins allowlist (#97)', () => {
  it('is readable by signed-in users', async () => {
    await assertSucceeds(kid().ref('admins').get());
    await assertSucceeds(parent().ref('admins').get());
  });
  it('is not readable without sign-in', async () => {
    await assertFails(env.unauthenticatedContext().database().ref('admins').get());
  });
  it('cannot be written by a kid (no self-promotion)', async () => {
    await assertFails(kid().ref('admins/kid-uid').set('Kid'));
  });
  it('cannot be written even by a listed parent (JT edits it in the Console)', async () => {
    await assertFails(parent().ref('admins/uid-other').set('Lynnie'));
    await assertFails(parent().ref('admins/uid-jt').remove());
  });
});
