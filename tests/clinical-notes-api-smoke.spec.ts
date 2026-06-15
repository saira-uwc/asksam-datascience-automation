import { test, expect } from '@playwright/test';
import type { APIResponse, TestInfo } from '@playwright/test';
import {
  loadClinicalNotesManifest,
  getSmokeEndpoints,
  clinicalNotesUrl,
  formatClinicalNotesApiProof,
  resolveEndpointHeaders,
  loadDsApiHeaders,
  DS_API_HEADERS_PATH,
  type ClinicalNotesEndpoint,
} from '../utils/clinicalNotesApi';

async function attachApiProof(
  testInfo: TestInfo,
  endpoint: ClinicalNotesEndpoint,
  response: APIResponse,
  body: unknown,
) {
  const proof = formatClinicalNotesApiProof({
    endpoint,
    status: response.status(),
    body,
  });
  await testInfo.attach('api-response', {
    body: JSON.stringify(proof, null, 2),
    contentType: 'application/json',
  });
}

async function readResponseBody(response: APIResponse): Promise<unknown> {
  const contentType = response.headers()['content-type'] || '';
  const text = await response.text();
  if (!text) return '';
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

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

      expect(response.status()).toBe(endpoint.expectedStatus);
      assertBody(endpoint, body);
      await attachApiProof(testInfo, endpoint, response, body);
    });
  }
});
