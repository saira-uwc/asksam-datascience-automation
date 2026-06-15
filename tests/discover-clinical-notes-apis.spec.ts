import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { DashboardPage } from '../pages/dashboard.page';
import {
  attachDataScienceApiCapture,
  dedupeCapturedCalls,
  type CapturedApiCall,
} from '../utils/apiCapture';
import {
  buildManifestFromCapture,
  saveClinicalNotesManifest,
  MANIFEST_PATH,
} from '../utils/clinicalNotesApi';
import { captureRawAuthHeaders, saveDsApiHeaders } from '../utils/dsApiHeaders';

const PDF_PATH = path.resolve('uploads/Yamini_Pal_Health_Summary.pdf');

test.describe('Discover Clinical Notes APIs (one-time)', () => {
  test('capture prod Copilot DS calls and write fixtures/clinical-notes-apis.json', async ({
    page,
  }, testInfo) => {
    test.setTimeout(600000);

    const captured: CapturedApiCall[] = [];
    const rawAuthByHost = captureRawAuthHeaders(page);
    attachDataScienceApiCapture(page, captured, { includeAsksamApi: true });

    await page.goto('https://copilot.asksam.com.au/clinical/home');
    await page.waitForURL('**/clinical/home', { timeout: 60000 });

    const dashboard = new DashboardPage(page);
    await dashboard.clickCreateClinicalNote();
    await dashboard.selectPatientWithFallback();

    if (fs.existsSync(PDF_PATH)) {
      await dashboard.openUploadModal();
      await dashboard.uploadFile(PDF_PATH);
      await dashboard.transcribeAndSend();
      await dashboard.acceptDisclaimers().catch(() => {});
      await dashboard.verifyClinicalTabsHaveData().catch(() => {});
    } else {
      testInfo.annotations.push({
        type: 'note',
        description:
          `Upload PDF missing at ${PDF_PATH} — captured create-note/patient APIs only. Add PDF and re-run for full transcription endpoints.`,
      });
    }

    await page.waitForTimeout(5000);

    const unique = dedupeCapturedCalls(captured);
    expect(unique.length).toBeGreaterThan(0);

    const manifest = buildManifestFromCapture(unique);
    saveClinicalNotesManifest(manifest);
    saveDsApiHeaders(rawAuthByHost);

    const smokeCount = manifest.endpoints.filter((endpoint) => endpoint.smoke).length;
    await testInfo.attach('clinical-notes-apis.json', {
      body: JSON.stringify(manifest, null, 2),
      contentType: 'application/json',
    });

    console.log(`Captured ${unique.length} DS API calls`);
    console.log(`Wrote manifest: ${MANIFEST_PATH}`);
    console.log(`Smoke endpoints: ${smokeCount}`);
    console.log(`Base URL: ${manifest.baseUrl || '(proxied only — set CLINICAL_NOTES_API_BASE_URL)'}`);

    expect(manifest.endpoints.length).toBeGreaterThan(0);
    if (smokeCount === 0) {
      console.warn('No smoke endpoints auto-selected — review fixtures/clinical-notes-apis.json');
    } else {
      expect(smokeCount).toBeGreaterThan(0);
    }
  });
});
