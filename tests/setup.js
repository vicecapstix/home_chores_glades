import { webcrypto } from 'node:crypto';

// Ensure crypto.subtle is available in jsdom (needed for sha256 in utils.js)
if (!globalThis.crypto?.subtle) {
  globalThis.crypto = webcrypto;
}
