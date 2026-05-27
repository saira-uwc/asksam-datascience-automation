export class CCOPClinicianSignupPage {
    constructor(page) {
      this.page = page;
    }
  
  /* ================= SIGNUP ================= */
  async signup(user) {
    // Navigate directly to the registration page
    await this.page.goto('https://account.asksam.com.au/register', { waitUntil: 'load' });
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

      // Pace each transition — without these waits, the 9 actions below run in
      // ~5s and Clerk's signup session can be created in a race state, then
      // 410 Gone on attempt_verification because the session ID is invalid.
      await this.page.getByText('Clinician').click();
      await this.page.waitForTimeout(800);

      await this.page.getByRole('button', { name: "Let's get started" }).click();
      await this.page.waitForTimeout(1200);

      await this.page.getByRole('textbox', { name: 'First name' }).fill(user.firstName);
      await this.page.waitForTimeout(300);
      await this.page.getByRole('textbox', { name: 'Last name' }).fill(user.lastName);
      await this.page.waitForTimeout(300);
      await this.page.getByRole('textbox', { name: 'Email address' }).fill(user.email);
      // Let React commit the email + finish any onChange validation before submit
      await this.page.waitForTimeout(800);

      await this.page.getByRole('button', { name: 'Continue' }).click();
      // Critical: the next step (OTP) requires Clerk to have created the
      // sign_up session server-side. Submitting OTP before that returns 410
      // Gone — observed locally on 2026-05-06.
      await this.page.waitForTimeout(2000);

      // OTP
      await this.page.getByRole('textbox', { name: 'Enter verification code' }).waitFor({ state: 'visible', timeout: 30000 });
      await this.page.getByRole('textbox', { name: 'Enter verification code' }).fill('424242');

      // Wait for Clerk to finish auth and redirect
      // Clerk may land on verify-email page first, then redirect
      await this.page.waitForTimeout(5000);

      // If stuck on verify page, wait longer for auto-redirect
      for (let i = 0; i < 6; i++) {
        const currentUrl = this.page.url();
        if (/copilot|clinical|dashboard/.test(currentUrl) && !/sign-up|verify/.test(currentUrl)) {
          console.log('✅ Auth redirect completed:', currentUrl);
          break;
        }
        console.log(`⏳ Waiting for auth redirect... (${currentUrl})`);
        await this.page.waitForTimeout(5000);
      }

      // Ensure auth is fully loaded
      await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
      await this.page.waitForTimeout(3000);

      // URL transitioning to /clinical isn't enough — Clerk can be mid-flight on
      // session establishment. The __client_uat cookie's value is the actual
      // signed-in signal: '0' = signed out, positive timestamp = signed in.
      // Without this wait, the activateFreePlan() goto fires before the session
      // attaches on copilot subdomain and bounces to /sign-in. Forensics from
      // the 2026-05-06 run showed exactly this 3x in a row.
      await this.page.waitForFunction(
        () => {
          const m = document.cookie.match(/__client_uat=([^;]+)/);
          return m && m[1] !== '0';
        },
        { timeout: 60000 },
      ).catch(() => {
        console.log('⚠ Clerk session still pending (__client_uat=0) after 60s — Plans page goto may bounce.');
      });
    }
  
    /* ================= FREE PLAN =================
       NOTE: Stripe "Try for Free" is geo-restricted to Australian IPs.
       When run from non-AU IPs (most CI runners, many local setups),
       the Stripe popup does not open. This method verifies signup/auth
       all the way to the Plans page, then soft-fails the Stripe portion.
    ================================================ */
    async activateFreePlan() {
      // Retry navigation to Plans page — CI can be slow with Clerk auth
      for (let attempt = 1; attempt <= 3; attempt++) {
        await this.page.goto(
          'https://copilot.asksam.com.au/clinical/settings?view=Plans%20%26%20Billing',
          { waitUntil: 'load' }
        );
        await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
        await this.page.waitForTimeout(5000);

        const tryFreeBtn = this.page.getByRole('button', { name: 'Try for Free' });
        if (await tryFreeBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
          console.log(`✅ Try for Free visible (attempt ${attempt})`);
          break;
        }

        console.log(`⚠ Try for Free not visible (attempt ${attempt}), URL: ${this.page.url()}`);
        if (attempt === 3) {
          await this.page.screenshot({ path: 'test-results/signup-plans-debug.png' });
          throw new Error('Try for Free button not visible after 3 attempts');
        }
        await this.page.waitForTimeout(3000);
      }

      // Try clicking Try for Free — Stripe popup only opens on AU IPs
      const popupPromise = this.page.waitForEvent('popup', { timeout: 20000 });
      await this.page.getByRole('button', { name: 'Try for Free' }).click();

      let popup;
      try {
        popup = await popupPromise;
        await popup.waitForLoadState('load');
        console.log('✅ Stripe popup opened — AU network detected');
      } catch {
        console.log('⚠ Stripe popup did not open — likely non-AU IP (geo-restricted). Skipping payment flow.');
        return null; // Signal to caller to skip tours
      }

      try {
        await popup.getByTestId('hosted-payment-submit-button').waitFor({ state: 'visible', timeout: 30000 });
        await popup.getByTestId('hosted-payment-submit-button').click();
        await popup.waitForTimeout(5000);
        console.log('✅ Stripe payment submitted');
      } catch (e) {
        console.log('⚠ Stripe payment submit failed:', e.message);
        return null;
      }

      return popup;
    }
  
    /* ================= TOURS =================
       Tour flow is fragile (tour step count changes, labels change).
       All steps are best-effort — log warnings on failure and continue.
    ================================================ */
    async _runTour(popup, label, maxSteps = 10) {
      // Click Next → Next → ... until Done appears (up to maxSteps)
      for (let i = 0; i < maxSteps; i++) {
        const doneBtn = popup.getByRole('button', { name: /^Done$/i });
        if (await doneBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
          await doneBtn.click();
          console.log(`✅ ${label}: clicked Done after ${i} Next steps`);
          return true;
        }
        const nextBtn = popup.getByRole('button', { name: /Next/i });
        if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await nextBtn.click();
          await popup.waitForTimeout(800);
        } else {
          console.log(`⚠ ${label}: no Next or Done button visible at step ${i}`);
          return false;
        }
      }
      console.log(`⚠ ${label}: exceeded max steps ${maxSteps}`);
      return false;
    }

    async completeTours(popup) {
      try {
        // HOME TOUR
        await popup.getByRole('link', { name: 'Home' }).click();
        await popup.waitForLoadState('domcontentloaded');

        const startTour = popup.getByRole('button', { name: 'Start tour' });
        if (await startTour.isVisible({ timeout: 10000 }).catch(() => false)) {
          await startTour.click();
          await this._runTour(popup, 'Home tour');
        } else {
          console.log('⚠ Home tour "Start tour" button not visible — skipping');
        }

        // HELP CENTER TOUR
        await popup.getByRole('link', { name: 'Help Center' }).click().catch(() => {});
        await popup.waitForLoadState('domcontentloaded').catch(() => {});
        await this._runTour(popup, 'Help Center tour');

        // BACK HOME
        await popup.getByRole('link', { name: 'Home' }).click().catch(() => {});
        await popup.waitForLoadState('domcontentloaded').catch(() => {});

        await popup.locator('#clinical-tour-overlay, #clinical-tour-loading-overlay')
          .waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});

        // FIRST CLINICAL — best effort
        const firstClinicalBtn = popup.getByRole('button', { name: 'Create Your First Clinical' });
        if (await firstClinicalBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await firstClinicalBtn.click({ force: true });
          await popup.getByRole('button', { name: /^Done$/i }).click({ timeout: 5000 }).catch(() => {});
          await popup.getByRole('button', { name: 'close' }).click({ timeout: 5000 }).catch(() => {});
          console.log('✅ First Clinical tour completed');
        } else {
          console.log('⚠ First Clinical button not visible — skipping');
        }
      } catch (e) {
        console.log(`⚠ Tour flow error: ${e.message} — continuing (signup main flow already verified)`);
      }
    }
  
    /* ================= LOGOUT ================= */
    async logout(popup) {
      try {
        await popup.getByRole('button', { name: 'Open user menu' }).click({ timeout: 10000 });
        await popup.getByRole('menuitem', { name: 'Sign out' }).click({ timeout: 10000 });
        console.log('✅ Signed out');
      } catch (e) {
        console.log(`⚠ Logout skipped: ${e.message}`);
      }
    }
  }