import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PWA_MOBILE_BASE_URL || 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['pwa-mobile-gate.spec.ts'],
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-mobile', open: 'never' }]],
  outputDir: 'test-results-mobile',
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'android-chrome',
      use: {
        ...devices['Pixel 5'],
        browserName: 'chromium',
      },
    },
    {
      name: 'ios-safari',
      use: {
        ...devices['iPhone SE'],
        browserName: 'webkit',
      },
    },
  ],
});
