import { test, expect } from '../utils/forensics-fixture';
import { ExpertAppointmentPage } from '../pages/expert-appointment.page.js';

test.describe('Expert Dashboard | Create & Reschedule Appointment', () => {
  test('create appointment with existing patient and reschedule', async ({ page }) => {
    const appointment = new ExpertAppointmentPage(page);

    /* ===== GO TO EXPERT DASHBOARD (auth loaded via storageState) ===== */
    await page.goto('https://dashboard.asksam.com.au/expert/dashboard');
    await expect(page).toHaveURL(/expert\/dashboard/);

    /* ===== OPEN APPOINTMENTS + BOOK FLOW ===== */
    await appointment.openAppointments();

    /* ===== SELECT EXISTING PATIENT ===== */
    const existingPatient = 'testsaira';
    await appointment.selectExistingPatient(existingPatient);

    /* ===== SELECT EXPERT & SERVICE ===== */
    await appointment.selectExpert();

    /* ===== BOOK APPOINTMENT (DYNAMIC SLOTS) ===== */
    await appointment.bookAppointment();

    /* ===== SEARCH CREATED APPOINTMENT ===== */
    await appointment.searchAppointment(existingPatient);

    /* ===== OPEN FIRST APPOINTMENT ===== */
    await appointment.openFirstAppointment();
    await appointment.openReschedule();

    /* ===== RESCHEDULE (DYNAMIC DATE + SLOT) ===== */
    await appointment.rescheduleAppointment();

  });
});