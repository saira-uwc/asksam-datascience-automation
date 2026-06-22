import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../utils/forensics-fixture';
import { DashboardPage } from '../pages/dashboard.page';
import { AIAssistantPanelPage } from '../pages/ai-assistant-panel.page';
import {
  attachDataScienceApiCapture,
  dedupeCapturedCalls,
  type CapturedApiCall,
} from '../utils/apiCapture';
import {
  attachJourneyReport,
  buildJourneyReport,
  formatJourneyFailureSummary,
  sliceJourneyCalls,
  type JourneySegment,
} from '../utils/journeyRecord';

const PDF_PATH = path.resolve('uploads/Yamini_Pal_Health_Summary.pdf');
const REPORT_PATH = path.resolve('reports/journey-api-record.json');

test.use({ viewport: { width: 1440, height: 900 } });

test.describe('DS UI journey record (one-time)', () => {
  test('record Clinical Notes + Assistant panel journeys with API proof', async ({ page }, testInfo) => {
    test.setTimeout(900000);

    const captured: CapturedApiCall[] = [];
    const segments: JourneySegment[] = [];
    let marker = 0;

    attachDataScienceApiCapture(page, captured, { includeAsksamApi: true });

    const recordSegment = (id: string, name: string, steps: string[], uiError?: string) => {
      const apis = sliceJourneyCalls(captured, marker);
      marker = captured.length;
      const failedApis = apis.filter((api) => api.status >= 400);
      segments.push({ id, name, steps, apis, failedApis, uiError });
    };

    try {
      // ── Journey 1: Clinical Notes ──
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
        await page.waitForTimeout(5000);
        recordSegment('clinical-notes', 'Clinical Notes', [
          'Open Copilot home',
          'Create Clinical Note',
          'Select patient',
          'Upload PDF + transcribe',
          'Verify clinical tabs',
        ]);
      } else {
        recordSegment('clinical-notes', 'Clinical Notes', [
          'Open Copilot home',
          'Create Clinical Note',
          'Select patient',
          `(PDF missing at ${PDF_PATH} — upload/transcription APIs not triggered)`,
        ]);
        testInfo.annotations.push({
          type: 'note',
          description: `Add PDF at ${PDF_PATH} and re-run for full Clinical Notes API capture.`,
        });
      }

      // ── Journey 2: Assistant panel (Graph / Assistant / asksam) ──
      const aiPanel = new AIAssistantPanelPage(page);

      await aiPanel.openExistingPatientNote();
      await aiPanel.openFloatingPanel();
      recordSegment('assistant-panel-open', 'Assistant Panel — open', [
        'Open existing patient note',
        'Open floating AI panel',
      ]);

      await aiPanel.testGraphTab();
      recordSegment('assistant-graph', 'Assistant Panel — Graph tab', [
        'Graph tab — NeoGraph + Stella clinical knowledge graph APIs',
      ]);

      await aiPanel.testAssistantTab();
      recordSegment('assistant-assistant', 'Assistant Panel — Assistant tab', [
        'Assistant tab — drug interaction / association APIs',
      ]);

      await aiPanel.testAsksamTab();
      recordSegment('assistant-asksam', 'Assistant Panel — asksam tab', [
        'asksam tab — Stella interactions + RAG gen-chat APIs',
      ]);

      await aiPanel.closePanel();
      await page.waitForTimeout(2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (marker < captured.length) {
        recordSegment('failed-step', 'Failed during journey', ['See video/trace attachments'], message);
      } else if (segments.length > 0) {
        segments[segments.length - 1].uiError = message;
      } else {
        recordSegment('failed-step', 'Failed during journey', ['See video/trace attachments'], message);
      }
      throw error;
    } finally {
      const unique = dedupeCapturedCalls(captured);
      const report = buildJourneyReport(segments);
      report.summary.totalApis = unique.length;

      fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
      fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

      await attachJourneyReport(testInfo, report);

      console.log('\n── Journey API record ──');
      for (const segment of segments) {
        console.log(
          `${segment.name}: ${segment.apis.length} APIs` +
            (segment.failedApis.length ? `, ${segment.failedApis.length} FAILED` : ''),
        );
        for (const api of segment.failedApis) {
          console.log(`  ✗ ${api.method} ${api.fullUrl} → ${api.status}`);
        }
      }
      console.log(`Report: ${REPORT_PATH}\n`);

      const summary = formatJourneyFailureSummary(report);
      if (summary) {
        await testInfo.attach('journey-failures-summary', {
          body: summary,
          contentType: 'text/plain',
        });
      }
    }

    const report = buildJourneyReport(segments);
    const failedSegments = report.segments.filter(
      (segment) => segment.failedApis.length > 0 || segment.uiError,
    );

    if (failedSegments.length > 0) {
      expect(
        failedSegments,
        `Journey failures detected — see journey-api-record attachment and ${REPORT_PATH}\n${formatJourneyFailureSummary(report)}`,
      ).toHaveLength(0);
    }

    expect(segments.length).toBeGreaterThan(0);
    expect(captured.length).toBeGreaterThan(0);
  });
});
