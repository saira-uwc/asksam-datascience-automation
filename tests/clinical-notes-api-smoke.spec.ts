import { test, expect } from '@playwright/test';
import {
  loadClinicalNotesManifest,
  getSmokeEndpoints,
  clinicalNotesUrl,
  resolveEndpointHeaders,
  loadDsApiHeaders,
  DS_API_HEADERS_PATH,
  type ClinicalNotesEndpoint,
} from '../utils/clinicalNotesApi';
import { readResponseBody, attachApiProof } from '../utils/apiProof';

function assertBody(endpoint: ClinicalNotesEndpoint, body: unknown) {
  if (endpoint.bodyMatch && body && typeof body === 'object') {
    expect(body).toMatchObject(endpoint.bodyMatch);
  }
  if (endpoint.bodyContains?.length) {
    const serialized = JSON.stringify(body).toLowerCase();
    for (const fragment of endpoint.bodyContains) {
      expect(serialized).toContain(fragment.toLowerCase());
    }
  }
}

test.describe('Clinical Notes API smoke', () => {
  const manifest = loadClinicalNotesManifest();
  const smokeEndpoints = getSmokeEndpoints(manifest);
  const dsApiHeaders = loadDsApiHeaders();

  if (Object.keys(dsApiHeaders).length === 0) {
    test('TC_CN_00 - auth headers pending', async () => {
      test.skip(
        true,
        `Missing ${DS_API_HEADERS_PATH} — scp from discovery machine or run: npm run discover:clinical-notes-apis`,
      );
    });
    return;
  }

  if (smokeEndpoints.length === 0) {
    test('TC_CN_00 - manifest pending discovery', async () => {
      test.skip(
        true,
        'No smoke endpoints in fixtures/clinical-notes-apis.json — run: npm run discover:clinical-notes-apis',
      );
    });
    return;
  }

  for (const endpoint of smokeEndpoints) {
    test(`${endpoint.id} - ${endpoint.method} ${endpoint.name}`, async ({ request }, testInfo) => {
      const timeoutMs = endpoint.method === 'POST' ? 180000 : 60000;
      test.setTimeout(timeoutMs);

      let targetUrl: string;
      try {
        targetUrl = clinicalNotesUrl(manifest, endpoint);
      } catch (error) {
        test.skip(true, (error as Error).message);
        return;
      }

      const headers = resolveEndpointHeaders(endpoint);

      const options: Parameters<typeof request.fetch>[1] = {
        method: endpoint.method,
        headers,
        timeout: timeoutMs,
      };

      if (endpoint.method !== 'GET' && endpoint.method !== 'HEAD' && endpoint.samplePayload !== undefined) {
        options.data = endpoint.samplePayload;
      }

      const response = await request.fetch(targetUrl, options);
      const body = await readResponseBody(response);
      const pathOrUrl = endpoint.fullUrl || endpoint.path;

      await attachApiProof(testInfo, {
        endpoint: pathOrUrl,
        method: endpoint.method,
        status: response.status(),
        body,
        url: targetUrl,
        extra: { id: endpoint.id, name: endpoint.name },
      });

      expect(response.status()).toBe(endpoint.expectedStatus);
      assertBody(endpoint, body);
    });
  }
});
