import { defineConfig } from '@playwright/test';
const hosted = process.env.TEST_BASE_URL?.startsWith('https://') === true;
export default defineConfig({
  testDir: './tests/browser',
  timeout: hosted ? 150_000 : 45_000,
  expect: { timeout: hosted ? 15_000 : 5_000 },
  use: { baseURL: process.env.TEST_BASE_URL || 'http://localhost:5173', headless: true },
  workers: 1,
  reporter: 'list'
});
