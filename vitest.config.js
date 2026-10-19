import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    // Rules tests need the Firebase emulator (Java); run them with `npm run test:rules`.
    exclude: ['**/node_modules/**', 'tests/rules/**'],
  },
});
