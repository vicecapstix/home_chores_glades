import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

// Local emulator only: demo- project IDs never reach a real Firebase project.
export const PROJECT_ID = 'demo-familyflow';

export async function setupEnv() {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    database: { rules: readFileSync('firebase-rules.json', 'utf8') },
  });
}

// Minimal valid /state (the rules require nextId).
export function baseState(extra = {}) {
  return {
    nextId: 1,
    members: { Alice: { name: 'Alice', role: 'admin', pinHash: '', points: 0 } },
    tasks: { t1: { id: 't1', name: 'Dishes', freq: 'daily', done: false } },
    ...extra,
  };
}

// Seed data while bypassing the rules.
export async function seed(env, path, value) {
  await env.withSecurityRulesDisabled(ctx => ctx.database().ref(path).set(value));
}
