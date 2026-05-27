import { test, expect } from '../utils/forensics-fixture';
import { HelpCenterPage } from '../pages/help-center.page.js';

test(
  'Expert Dashboard | Help Center raise & reply ticket',
  async ({ page }) => {

    /* ===== DASHBOARD (auth loaded via storageState) ===== */
    await page.goto('https://dashboard.asksam.com.au/expert/dashboard');
    await page.waitForSelector('body', { timeout: 60000 });

    // Poll until sidebar is ready
    const helpCenterLink = page.getByRole('link', { name: 'Help Center' });
    for (let i = 0; i < 20; i++) {
      if (await helpCenterLink.isVisible()) break;
      await page.waitForTimeout(1000);
    }

    const helpCenter = new HelpCenterPage(page);

    /* ===== HELP CENTER FLOW ===== */
    await helpCenter.openHelpCenter();

    await helpCenter.raiseTicket({
      subject: 'Any Other Issue',
      message: 'test issue',
      fileName: 'test-image.png',
    });

    await helpCenter.openLatestTicket();
    await helpCenter.replyToTicket('test');
    await helpCenter.closeTicketPopup();
  }
);
