import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { TEST_CONFIG } from '../utils/testData';

/**
 * AskSam Clerk OTP login (test mode uses fixed OTP 424242).
 * Uses LOGIN_URL / TEST_EMAIL from environment via testData.
 */
export class LoginPage extends BasePage {
  readonly emailInput = this.page.getByRole('textbox', { name: 'Email address' });
  readonly otpInput = this.page.getByRole('textbox', { name: 'Enter verification code' });
  readonly continueBtn = this.page.getByRole('button', { name: 'Continue' });

  constructor(page: Page) {
    super(page);
  }

  async loginAsClinician(email?: string) {
    const clinicianEmail = email || TEST_CONFIG.credentials.email;
    const loginUrl = TEST_CONFIG.urls.login;

    await this.page.goto(loginUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    // Legacy account register page still needs role selection; prod Copilot /sign-in goes straight to email.
    const loginHere = this.page.getByRole('button', { name: 'Log in here' });
    if (await loginHere.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginHere.click();
      await this.page.waitForTimeout(800);

      const clinicianOption = this.page.getByText('Clinician', { exact: true }).first();
      await clinicianOption.waitFor({ state: 'visible', timeout: 30000 });
      await clinicianOption.click();
      await this.page.waitForTimeout(800);

      await this.continueBtn.first().waitFor({ state: 'visible', timeout: 30000 });
      await this.continueBtn.first().click();
      await this.page.waitForTimeout(800);
    }

    await this.emailInput.waitFor({ state: 'visible', timeout: 30000 });
    await this.emailInput.fill(clinicianEmail);
    await this.page.waitForTimeout(500);

    await this.continueBtn.first().waitFor({ state: 'visible', timeout: 15000 });
    await this.continueBtn.first().click();
    await this.page.waitForTimeout(1500);

    await this.otpInput.waitFor({ state: 'visible', timeout: 30000 });
    await this.otpInput.fill(TEST_CONFIG.credentials.otp);
    await this.page.waitForTimeout(5000);

    const copilotHome = TEST_CONFIG.urls.copilotHome;
    await this.page.waitForURL('**/clinical/home', { timeout: 90000 }).catch(async () => {
      await this.page.goto(copilotHome, { waitUntil: 'load', timeout: 30000 });
    });

    await this.page
      .waitForFunction(
        () => {
          const m = document.cookie.match(/__client_uat=([^;]+)/);
          return m && m[1] !== '0';
        },
        { timeout: 60000 },
      )
      .catch(() => {
        throw new Error(
          'Login reached /clinical/home but Clerk session was never granted (__client_uat=0).',
        );
      });
  }

  async assertLoggedIn() {
    expect(this.page.url()).not.toMatch(/sign-in|login|account\.asksam/);
  }

  async logout() {
    await this.page.getByRole('button', { name: 'Open user menu' }).click();
    await this.page.getByRole('menuitem', { name: 'Sign out' }).click();
    await this.page.waitForURL(/sign-in/, { timeout: 15000 });
  }
}
