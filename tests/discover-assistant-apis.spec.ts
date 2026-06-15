import { test, expect } from '@playwright/test';
import { AIAssistantPanelPage } from '../pages/ai-assistant-panel.page';
import {
  attachDataScienceApiCapture,
  dedupeCapturedCalls,
  type CapturedApiCall,
} from '../utils/apiCapture';
import {
  buildAssistantManifestFromCapture,
  saveAssistantManifest,
  MANIFEST_PATH,
  type TaggedCapturedApiCall,
  type AssistantTab,
} from '../utils/assistantApi';
import { captureRawAuthHeaders, saveDsApiHeaders } from '../utils/dsApiHeaders';

test.use({ viewport: { width: 1440, height: 900 } });

function tagCalls(calls: TaggedCapturedApiCall[], tab: AssistantTab, fromIndex: number) {
  for (let i = fromIndex; i < calls.length; i++) {
    calls[i].tab = tab;
  }
}

test.describe('Discover Assistant panel APIs (one-time)', () => {
  test('capture Graph, Assistant, and asksam tab DS calls', async ({ page }, testInfo) => {
    test.setTimeout(600000);

    const captured: TaggedCapturedApiCall[] = [];
    const rawAuthByHost = captureRawAuthHeaders(page);
    attachDataScienceApiCapture(page, captured, { includeAsksamApi: true });

    const aiPanel = new AIAssistantPanelPage(page);
    let marker = 0;

    await aiPanel.openExistingPatientNote();
    await aiPanel.openFloatingPanel();
    tagCalls(captured, 'panel', marker);
    marker = captured.length;

    await aiPanel.testGraphTab();
    tagCalls(captured, 'graph', marker);
    marker = captured.length;

    await aiPanel.testAssistantTab();
    tagCalls(captured, 'assistant', marker);
    marker = captured.length;

    await aiPanel.testAsksamTab();
    tagCalls(captured, 'asksam', marker);
    marker = captured.length;

    await aiPanel.closePanel();
    await page.waitForTimeout(3000);

    const unique = dedupeCapturedCalls(captured) as TaggedCapturedApiCall[];
    expect(unique.length).toBeGreaterThan(0);

    const manifest = buildAssistantManifestFromCapture(unique);
    saveAssistantManifest(manifest);
    saveDsApiHeaders(rawAuthByHost);

    const smokeCount = manifest.endpoints.filter((endpoint) => endpoint.smoke).length;
    const byTab = manifest.endpoints.reduce(
      (acc, endpoint) => {
        if (endpoint.smoke) acc[endpoint.tab] = (acc[endpoint.tab] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    await testInfo.attach('assistant-apis.json', {
      body: JSON.stringify(manifest, null, 2),
      contentType: 'application/json',
    });

    console.log(`Captured ${unique.length} Assistant panel DS API calls`);
    console.log(`Wrote manifest: ${MANIFEST_PATH}`);
    console.log(`Smoke endpoints: ${smokeCount}`, byTab);

    expect(manifest.endpoints.length).toBeGreaterThan(0);
    if (smokeCount === 0) {
      console.warn('No smoke endpoints auto-selected — review fixtures/assistant-apis.json');
    } else {
      expect(smokeCount).toBeGreaterThan(0);
    }
  });
});
