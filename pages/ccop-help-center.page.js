import path from 'path';

export class CCOPHelpCenterPage {
  constructor(page) {
    this.page = page;
  }

  /* ===== OPEN HELP CENTER ===== */
  async openHelpCenter() {
    await this.page.getByRole('link', { name: 'Help Center' }).click();
  }

  /* ===== RAISE TICKET ===== */
  async raiseTicket({ subject, message, fileName }) {
    await this.page.getByRole('button', { name: 'Raise Ticket' }).click();

    // Subject
    await this.page.getByRole('combobox', { name: /Subject/i }).click();
    await this.page.getByRole('option', { name: subject }).click();

    // Message
    await this.page
      .getByRole('textbox', { name: /Message/i })
      .fill(message);

    // ✅ FILE UPLOAD (CORRECT WAY)
    if (fileName) {
      const filePath = path.resolve('uploads', fileName);

      const fileInput = this.page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);
    }

    await this.page.getByRole('button', { name: 'Submit Ticket' }).click();

    await this.page
      .getByText(/Ticket raised successfully/i)
      .waitFor({ timeout: 10000 });
  }

  /* ===== OPEN LATEST TICKET ===== */
  async openLatestTicket() {
    await this.page.getByRole('button', { name: 'Reply' }).first().click();
  }

  /* ===== REPLY ===== */
  async replyToTicket(message) {
    await this.page
      .getByRole('textbox', { name: /Type your reply/i })
      .fill(message);

    // Send icon button
    await this.page.getByRole('button').nth(1).click();

    await this.page
      .getByText(/Reply sent successfully/i)
      .waitFor({ timeout: 10000 });
  }

  /* ===== CLOSE POPUP ===== */
  async closeTicketPopup() {
    const closeBtn = this.page
      .getByRole('button')
      .filter({ hasText: /^$/ })
      .first();

    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await this.page.waitForTimeout(800);
    }
  }

  /* ===== MARK RESOLVED ===== */
  async markAsResolved() {
    await this.page
      .getByRole('button', { name: 'Mark as Resolved' })
      .first()
      .click();

    await this.page
      .getByText(/Ticket marked as resolved/i)
      .waitFor({ timeout: 10000 });
  }
}