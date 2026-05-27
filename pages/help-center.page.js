// pages/help-center.page.js
import path from 'path';

export class HelpCenterPage {
  constructor(page) {
    this.page = page;
  }

  async openHelpCenter() {
    await this.page.getByRole('link', { name: 'Help Center' }).click();
  }

  async raiseTicket({ subject, message, fileName }) {
    await this.page.getByRole('button', { name: 'Contact Support' }).click();

    // Subject
    await this.page.getByRole('combobox', { name: /Subject/i }).click();
    await this.page.getByRole('option', { name: subject }).click();

    // Message
    await this.page.getByRole('textbox', { name: /Explain in few words/i }).fill(message);

    // File upload (SAFE PATH)
    if (fileName) {
      const filePath = path.resolve('uploads', fileName);
      await this.page.setInputFiles('input[type="file"]', filePath);
    }

    await this.page.getByRole('button', { name: 'Submit' }).click();
  }

  async openLatestTicket() {
    // Click first row action button (dynamic ID/date safe)
    const firstRowButton = this.page
      .locator('tbody tr')
      .first()
      .getByRole('button');

    await firstRowButton.click();
  }

  async replyToTicket(message) {
    await this.page
      .getByRole('textbox', { name: /Type your message/i })
      .fill(message);

    await this.page.getByRole('button', { name: 'Send' }).click();
  }
  async closeTicketPopup() {
    const closeBtn = this.page
      .getByRole('button')
      .filter({ hasText: /^$/ })
      .first();

    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeBtn.click();
      await this.page.waitForTimeout(800); // UI stabilize
    }
  }
}