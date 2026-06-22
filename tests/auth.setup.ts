import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { TEST_CONFIG } from '../utils/testData';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  if (process.env.SKIP_AUTH_SETUP === 'true' && fs.existsSync(authFile)) {
    console.log(`Skipping auth setup — using existing ${authFile}`);
    return;
  }

  if (!TEST_CONFIG.credentials.email) {
    throw new Error('TEST_EMAIL is required in .env for auth setup');
  }

  const loginPage = new LoginPage(page);
  await loginPage.loginAsClinician(TEST_CONFIG.credentials.email);

  // Pre-warm both subdomains so storageState includes session cookies for each
  await page.goto(TEST_CONFIG.urls.expertDashboard);
  await page.waitForURL(/dashboard\.asksam\.com\.au\/expert\/dashboard/, { timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await expect(page.getByRole('link', { name: 'Appointments', exact: true }).first()).toBeVisible({
    timeout: 30000,
  });

  await page.goto(TEST_CONFIG.urls.copilotHome);
  await page.waitForURL(/copilot\.asksam\.com\.au\/clinical/, { timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await expect(page.getByRole('link', { name: 'Patients' })).toBeVisible({ timeout: 30000 });
  expect(page.url()).not.toMatch(/sign-in|login|account\.asksam/);

  await page.context().storageState({ path: authFile });
  console.log('Authentication state saved to:', authFile);
});
