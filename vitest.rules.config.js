import { defineConfig } from 'vitest/config';

// Rules tests need the Firebase emulator (and Java); run via `npm run test:rules`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['rules-tests/**/*.rules-test.js'],
  },
});
