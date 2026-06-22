import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  timeout: 180000,
  expect: { timeout: 15000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'reports/playwright-report.json' }],
    ['./utils/google-sheets-reporter.ts'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'https://copilot.asksam.com.au',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 60000,
    headless: true,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },
    {
      name: 'api',
      testMatch: /rag-api-smoke\.spec\.ts/,
    },
    {
      name: 'clinical-notes-api',
      testMatch: /clinical-notes-api-smoke\.spec\.ts/,
    },
    {
      name: 'assistant-api',
      testMatch: /assistant-api-smoke\.spec\.ts/,
    },
    {
      name: 'discover',
      testMatch: /discover-clinical-notes-apis\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
    },
    {
      name: 'discover-assistant',
      testMatch: /discover-assistant-apis\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'journey-record',
      testMatch: /ds-ui-journey-record\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
        viewport: { width: 1440, height: 900 },
        trace: 'on',
        video: 'on',
        screenshot: 'on',
      },
    },
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts/,
      testIgnore: [
        /ccop-clinician-signup\.spec\.ts/,
        /letter-template\.spec\.ts/,
        /rag-api-smoke\.spec\.ts/,
        /clinical-notes-api-smoke\.spec\.ts/,
        /assistant-api-smoke\.spec\.ts/,
        /discover-clinical-notes-apis\.spec\.ts/,
        /discover-assistant-apis\.spec\.ts/,
        /ds-ui-journey-record\.spec\.ts/,
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'letter-template',
      testMatch: /letter-template\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
    },
    {
      name: 'ccop-signup',
      testMatch: /ccop-clinician-signup\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.AU_PROXY_SERVER && {
          proxy: {
            server: process.env.AU_PROXY_SERVER,
            username: process.env.AU_PROXY_USERNAME || undefined,
            password: process.env.AU_PROXY_PASSWORD || undefined,
          },
        }),
      },
    },
  ],
});
