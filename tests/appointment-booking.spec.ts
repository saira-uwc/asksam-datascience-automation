import { test, expect } from '../utils/forensics-fixture';
import { ExpertAppointmentPage } from '../pages/expert-appointment.page.js';

test('Expert Dashboard | Appointment booking (dynamic slots)', async ({ page }) => {
  const appointment = new ExpertAppointmentPage(page);

  /* ===== DASHBOARD (auth loaded via storageState) ===== */
  await page.goto('https://dashboard.asksam.com.au/expert/dashboard');
  await expect(page).toHaveURL(/expert\/dashboard/);

  /* ===== BOOK APPOINTMENT ===== */
  await appointment.openAppointments();
  await appointment.selectExistingPatient('testsaira');
  await appointment.selectExpert();
  await appointment.bookAppointment();
});
