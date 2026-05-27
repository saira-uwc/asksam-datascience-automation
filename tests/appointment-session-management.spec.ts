import { test, expect } from '../utils/forensics-fixture';
import { ExpertAppointmentPage } from '../pages/expert-appointment.page.js';

test.describe('Expert Dashboard | Session Management', () => {
  test('create appointment and manage session lifecycle', async ({ page }) => {
    const appointment = new ExpertAppointmentPage(page);

    /* ===== DASHBOARD (auth loaded via storageState) ===== */
    await page.goto('https://dashboard.asksam.com.au/expert/dashboard');
    await expect(page).toHaveURL(/expert\/dashboard/);

    /* ===== CREATE APPOINTMENT ===== */
    await appointment.openAppointments();
    await appointment.selectExistingPatient('testsaira');
    await appointment.selectExpert();
    await appointment.bookAppointment();

    /* ===== SESSION MANAGEMENT ===== */
    await appointment.openSessionManagement();

    // 1️⃣ Mark session
    await appointment.clickFirstMarkSession();
    await appointment.submitSession('test completed');

    // 2️⃣ Switch to Completed
    await appointment.switchSessionTab('Completed');

    // 3️⃣ Mark Not Completed
    await appointment.markNotCompleted();

    // 4️⃣ View & close
    await appointment.openAndCloseSessionDetails();

    // 5️⃣ Switch to Unmarked
    await appointment.switchSessionTab('Unmarked');

  });
});