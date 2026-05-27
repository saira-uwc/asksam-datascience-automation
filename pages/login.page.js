export class LoginPage {
  constructor(page) {
    this.page = page;

    this.emailInput = page.getByRole('textbox', { name: 'Email address' });
    this.otpInput = page.getByRole('textbox', { name: 'Enter verification code' });
    this.continueBtn = page.getByRole('button', { name: 'Continue' });
  }

  async loginAsClinician(email = 'testing_clinician_aus+clerk_test@tmail.com') {
    // Navigate to the registration/login page and wait for it to settle.
    // Without networkidle the immediate "Log in here" click can land on a
    // not-yet-rendered button, leaving the flow stuck before the email step.
    await this.page.goto('https://account.asksam.com.au/register', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    // Each step waits for its target to be visible before clicking — eliminates
    // the race where one click-to-next-render sequence stalls and the following
    // locator times out at 30s with no diagnostic. Small post-click pauses give
    // Clerk's React app time to mount the next form before we interact with it.
    const loginHere = this.page.getByRole('button', { name: 'Log in here' });
    await loginHere.waitFor({ state: 'visible', timeout: 30000 });
    await loginHere.click();
    await this.page.waitForTimeout(800);

    const clinicianOption = this.page.getByText('Clinician', { exact: true }).first();
    await clinicianOption.waitFor({ state: 'visible', timeout: 30000 });
    await clinicianOption.click();
    await this.page.waitForTimeout(800);

    await this.continueBtn.first().waitFor({ state: 'visible', timeout: 30000 });
    await this.continueBtn.first().click();
    await this.page.waitForTimeout(800);

    await this.emailInput.waitFor({ state: 'visible', timeout: 30000 });
    await this.emailInput.fill(email);
    // Brief pause so the email is fully committed to React state before submit;
    // a too-fast Continue click can submit an empty form on slow runners.
    await this.page.waitForTimeout(500);

    await this.continueBtn.first().waitFor({ state: 'visible', timeout: 15000 });
    await this.continueBtn.first().click();
    // Wait for the OTP form to actually mount — without this, fill() can race
    // the input rendering and silently drop digits.
    await this.page.waitForTimeout(1500);

    // OTP – always same as per your requirement (Clerk test mode)
    await this.otpInput.waitFor({ state: 'visible', timeout: 30000 });
    await this.otpInput.fill('424242');
    // Critical: Clerk auto-submits when all 6 digits are filled, but the
    // backend OTP validation + session establishment takes a few seconds.
    // Polling waitForURL too eagerly was reading the brief intermediate
    // /clinical/home redirect before the session cookie was actually set,
    // so subsequent navigations bounced to /sign-in (forensics 2026-05-06).
    await this.page.waitForTimeout(5000);

    // Wait for backend + redirect (CI auth can be slow/throttled)
    await this.page.waitForURL('**/clinical/home', { timeout: 90000 }).catch(async () => {
      // Fallback: if redirect didn't happen, navigate manually
      await this.page.goto('https://copilot.asksam.com.au/clinical/home', { waitUntil: 'load', timeout: 30000 });
    });

    // The URL reaching /clinical/home is not enough — Clerk can race ahead and
    // redirect transiently before the session is actually granted. The
    // __client_uat cookie value is Clerk's signed-in signal: '0' = signed out,
    // any positive timestamp = signed in. Wait for the real signal so the next
    // navigation doesn't bounce to /sign-in. Forensics from the 2026-05-06 run
    // showed __client_uat=0 + missing __session at the supposed end of login.
    await this.page.waitForFunction(
      () => {
        const m = document.cookie.match(/__client_uat=([^;]+)/);
        return m && m[1] !== '0';
      },
      { timeout: 60000 },
    ).catch(() => {
      throw new Error(
        'Login reached /clinical/home but Clerk session was never granted ' +
        '(__client_uat=0 after 60s). Likely a transient Clerk/network issue — ' +
        'check forensics cookies.json and network-failures.txt for 4xx/5xx ' +
        'on clerk.asksam.com.au.',
      );
    });
  }
  async logout() {
    await this.page.getByRole('button', { name: 'Open user menu' }).click();
    await this.page.getByRole('menuitem', { name: 'Sign out' }).click();
    await this.page.waitForURL(/sign-in/, { timeout: 15000 });
  }
}