import { test } from '../utils/forensics-fixture';
import { LoginPage } from '../pages/LoginPage';

test('TC_LOGOUT_01 - session cleanup after test suite', async ({ page }) => {
  await page.goto(process.env.COPILOT_HOME_URL || 'https://copilot.asksam.com.au/clinical/home');
  const login = new LoginPage(page);
  try {
    const menu = page.getByRole('button', { name: 'Open user menu' });
    if (await menu.isVisible({ timeout: 5000 })) {
      await login.logout();
    }
  } catch {
    console.log('Logout skipped — session may already be cleared');
  }
});
