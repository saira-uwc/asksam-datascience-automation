export class AppointmentPage {
  constructor(page) {
    this.page = page;
  }

  async selectUser(user) {
    const userBox = this.page.getByRole('combobox', { name: 'Search User' });
    await userBox.click();
    await userBox.fill(user);
    await this.page.getByText(user).first().click();
  }

  async selectExpert(expertName) {
    const expertBox = this.page.getByRole('combobox', { name: 'Search Expert' });
    await expertBox.click();
    await expertBox.fill(expertName);

    // IMPORTANT: pick suggestion row, not heading text
    await this.page
      .locator('[role="option"]', { hasText: expertName })
      .first()
      .click();
  }

  async selectConsult(category, type) {
    await this.page.getByRole('button', { name: category }).click();
    await this.page.getByRole('button', { name: type }).click();
  }

  // 🔥 FINAL SOLID DATE + SLOT LOGIC
  async findFirstAvailableSlot(maxDaysToTry = 45) {
    const dateInput = this.page.getByRole('textbox', {
      name: 'Appointment Date'
    });

    const findSlotsBtn = this.page.getByRole('button', {
      name: 'Find Slots'
    });

    const baseDate = new Date();

    for (let offset = 0; offset < maxDaysToTry; offset++) {
      const tryDate = new Date(baseDate);
      tryDate.setDate(baseDate.getDate() + offset);

      const formattedDate = this.formatDateMMDDYYYY(tryDate);
      console.log(`📅 Trying date: ${formattedDate}`);

      // 🔥 CLEAR + TYPE + ENTER (Material UI requires this)
      await dateInput.click();
      await dateInput.fill('');
      await dateInput.type(formattedDate, { delay: 100 });
      await dateInput.press('Enter');

      // wait for UI to accept date
      await this.page.waitForTimeout(1200);

      await findSlotsBtn.click();

      // wait for loader
      await this.page.waitForTimeout(2500);

      // wait until spinner disappears (if present)
      const loader = this.page.locator('text=Fetching available slots');
      if (await loader.isVisible({ timeout: 1000 }).catch(() => false)) {
        await loader.waitFor({ state: 'hidden', timeout: 10000 });
      }

      const slots = this.page.locator(
        'button:has-text("AM"), button:has-text("PM")'
      );

      if (await slots.count() > 0) {
        console.log(`✅ Slot found on ${formattedDate}`);
        await slots.first().click();
        return;
      }

      console.log(`❌ No slots on ${formattedDate}`);
    }

    throw new Error(`❌ No slots available in next ${maxDaysToTry} days`);
  }

  async selectPayment(method) {
    await this.page.getByRole('radio', { name: method }).check();
  }

  async book() {
    await this.page.getByRole('button', { name: 'Book' }).click();
    await this.page.getByText(/Appointment Booked/i).waitFor({
      timeout: 15000
    });
  }

  formatDateMMDDYYYY(date) {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }
}