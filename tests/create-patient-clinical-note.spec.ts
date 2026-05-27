import { test } from '../utils/forensics-fixture';
import { PatientPage } from '../pages/patient.page.js';

test.describe('CCOP | Create new patient & clinical note (dynamic)', () => {
  test('Create patient + upload + submit', async ({ page }) => {
    // AI transcription can be slow — override global 120s limit
    test.setTimeout(180000);
    const patient = new PatientPage(page);

    /* ===== GO TO COPILOT (auth loaded via storageState) ===== */
    await page.goto('https://copilot.asksam.com.au/clinical/home');

    /* ===== CREATE PATIENT ===== */
    await patient.createNewPatient();

    /* ===== UPLOAD + TRANSCRIBE ===== */
    await patient.uploadAndTranscribe();

    /* ===== VERIFY TABS HAVE DATA ===== */
    await patient.verifyClinicalTabsHaveData();

    /* ===== SUBMIT NOTE ===== */
    await patient.submitClinicalNote();
  });
});
