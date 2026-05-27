import { test, expect } from '../utils/forensics-fixture';
import { CCOPHelpCenterPage } from '../pages/ccop-help-center.page.js';

test('CCOP | Help Center | Raise, Reply & Resolve Ticket', async ({ page }) => {
  const helpCenter = new CCOPHelpCenterPage(page);

  /* ===== GO TO COPILOT (auth loaded via storageState) ===== */
  await page.goto('https://copilot.asksam.com.au/clinical/home');
  await expect(page).toHaveURL(/clinical\/home/);

  /* ===== HELP CENTER ===== */
  await helpCenter.openHelpCenter();

  /* ===== RAISE ===== */
  await helpCenter.raiseTicket({
    subject: 'Any Other Issue',
    message: 'test',
    fileName: 'test-image.png',
  });

  /* ===== REPLY ===== */
  await helpCenter.openLatestTicket();
  await helpCenter.replyToTicket('test');

  /* ===== CLOSE MODAL ===== */
  await helpCenter.closeTicketPopup();

  /* ===== RESOLVE ===== */
  await helpCenter.markAsResolved();
});
