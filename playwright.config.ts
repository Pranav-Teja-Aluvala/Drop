import { defineConfig } from '@playwright/test';
const hosted = process.env.TEST_BASE_URL?.startsWith('https://') === true;
export default defineConfig({
  testDir: './tests/browser',
  // V1 UI specifications are retained as historical coverage; the live UI is V2.
  testMatch: ['**/v2.spec.ts','**/security.spec.ts','**/contact.spec.ts','**/offline-errors.spec.ts'],
  timeout: hosted ? 150_000 : 45_000,
  expect: { timeout: hosted ? 15_000 : 5_000 },
  use: { baseURL: process.env.TEST_BASE_URL || 'http://localhost:5173', headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? {channel:process.env.PLAYWRIGHT_CHANNEL} : {}) },
  workers: 1,
  reporter: 'list'
});
