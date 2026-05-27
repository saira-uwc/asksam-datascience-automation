import { test, expect } from '../utils/forensics-fixture';
import { ExpertAppointmentPage } from '../pages/expert-appointment.page.js';

test.describe('Expert Dashboard | Create & Cancel Appointment', () => {
  test('create appointment with existing patient and cancel non-cancelled one', async ({ page }) => {
    const appointment = new ExpertAppointmentPage(page);

    /* ===== DASHBOARD (auth loaded via storageState) ===== */
    await page.goto('https://dashboard.asksam.com.au/expert/dashboard');
    await expect(page).toHaveURL(/expert\/dashboard/);

    /* ===== BOOK APPOINTMENT ===== */
    await appointment.openAppointments();
    await appointment.selectExistingPatient('testsaira');
    await appointment.selectExpert();
    await appointment.bookAppointment();

    /* ===== SEARCH ===== */
    await appointment.searchAppointment('testsaira');

    /* ===== OPEN & CANCEL ONLY VALID APPOINTMENT ===== */
    await appointment.openAndCancelNonCancelledAppointment();

  });
});