import { test, expect } from '../utils/forensics-fixture';
import { ExpertAppointmentPage } from '../pages/expert-appointment.page.js';

test('Expert Dashboard | Create patient & book appointment', async ({ page }) => {
  const appointment = new ExpertAppointmentPage(page);

  /* ===== GO TO EXPERT DASHBOARD (auth loaded via storageState) ===== */
  await page.goto('https://dashboard.asksam.com.au/expert/dashboard');
  await expect(page).toHaveURL(/expert\/dashboard/);

  /* ===== APPOINTMENTS FLOW ===== */
  await appointment.openAppointments();

  const patient = await appointment.createPatient();
  console.log('✅ Created patient:', patient);

  // ✅ FIXED LINE
  await appointment.selectExistingPatient(
    `${patient.firstName} ${patient.lastName}`
  );

  await appointment.selectExpert();
  await appointment.bookAppointment();

});