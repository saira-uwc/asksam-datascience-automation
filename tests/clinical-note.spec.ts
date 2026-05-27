import { test } from '../utils/forensics-fixture';
import { DashboardPage } from '../pages/dashboard.page';
import path from 'path';

test('Create clinical note with document upload & transcription', async ({ page }) => {
  const dashboard = new DashboardPage(page);

  const filePath = path.resolve('uploads/Yamini_Pal_Health_Summary.pdf');

  /* ===== GO TO COPILOT (auth loaded via storageState) ===== */
  await page.goto('https://copilot.asksam.com.au/clinical/home');
  await page.waitForURL('**/clinical/home');

  await dashboard.clickCreateClinicalNote();
  await dashboard.selectPatientWithFallback();

  await dashboard.openUploadModal();
  await dashboard.uploadFile(filePath);

  await dashboard.transcribeAndSend();
  await dashboard.acceptDisclaimers();
  await dashboard.verifyClinicalTabsHaveData();
  await dashboard.saveAndSubmit();
});
