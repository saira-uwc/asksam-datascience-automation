import { test, expect } from '../utils/forensics-fixture';
import { ExpertAppointmentPage } from '../pages/expert-appointment.page.js';

test.describe('Expert Dashboard | Create Patient & View Profile', () => {
  test('create unique patient, search and view profile', async ({ page }) => {
    const patientPage = new ExpertAppointmentPage(page);

    /* ===== DASHBOARD (auth loaded via storageState) ===== */
    await page.goto('https://dashboard.asksam.com.au/expert/dashboard');
    await expect(page).toHaveURL(/expert\/dashboard/);

    /* ===== OPEN PATIENTS ===== */
    await patientPage.openPatients();

    /* ===== CREATE PATIENT ===== */
    const patient = await patientPage.createPatientFromPatientsModule();

    /* ===== WAIT (backend sync) ===== */
    await page.waitForTimeout(3000);

    /* ===== SEARCH & VIEW ===== */
    await patientPage.searchAndOpenPatient(patient.email);
  });
});
