import { defineConfig } from 'vitest/config';

// Security-rules tests (#96). Run via `npm run test:rules`, which starts the
// local RTDB emulator (demo-familyflow project, no network to production).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.js'],
    fileParallelism: false,
    testTimeout: 15000,
  },
});
