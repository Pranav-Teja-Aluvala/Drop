import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests/browser',timeout:45_000,use:{baseURL:process.env.TEST_BASE_URL || 'http://localhost:5173',headless:true},workers:1,reporter:'list'});
