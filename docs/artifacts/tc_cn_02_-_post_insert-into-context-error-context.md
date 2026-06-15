# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: clinical-notes-api-smoke.spec.ts >> Clinical Notes API smoke >> TC_CN_02 - POST insert-into-context
- Location: tests/clinical-notes-api-smoke.spec.ts:51:9

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 502
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import {
  3  |   loadClinicalNotesManifest,
  4  |   getSmokeEndpoints,
  5  |   clinicalNotesUrl,
  6  |   resolveEndpointHeaders,
  7  |   loadDsApiHeaders,
  8  |   DS_API_HEADERS_PATH,
  9  |   type ClinicalNotesEndpoint,
  10 | } from '../utils/clinicalNotesApi';
  11 | import { readResponseBody, attachApiProof } from '../utils/apiProof';
  12 | 
  13 | function assertBody(endpoint: ClinicalNotesEndpoint, body: unknown) {
  14 |   if (endpoint.bodyMatch && body && typeof body === 'object') {
  15 |     expect(body).toMatchObject(endpoint.bodyMatch);
  16 |   }
  17 |   if (endpoint.bodyContains?.length) {
  18 |     const serialized = JSON.stringify(body).toLowerCase();
  19 |     for (const fragment of endpoint.bodyContains) {
  20 |       expect(serialized).toContain(fragment.toLowerCase());
  21 |     }
  22 |   }
  23 | }
  24 | 
  25 | test.describe('Clinical Notes API smoke', () => {
  26 |   const manifest = loadClinicalNotesManifest();
  27 |   const smokeEndpoints = getSmokeEndpoints(manifest);
  28 |   const dsApiHeaders = loadDsApiHeaders();
  29 | 
  30 |   if (Object.keys(dsApiHeaders).length === 0) {
  31 |     test('TC_CN_00 - auth headers pending', async () => {
  32 |       test.skip(
  33 |         true,
  34 |         `Missing ${DS_API_HEADERS_PATH} — scp from discovery machine or run: npm run discover:clinical-notes-apis`,
  35 |       );
  36 |     });
  37 |     return;
  38 |   }
  39 | 
  40 |   if (smokeEndpoints.length === 0) {
  41 |     test('TC_CN_00 - manifest pending discovery', async () => {
  42 |       test.skip(
  43 |         true,
  44 |         'No smoke endpoints in fixtures/clinical-notes-apis.json — run: npm run discover:clinical-notes-apis',
  45 |       );
  46 |     });
  47 |     return;
  48 |   }
  49 | 
  50 |   for (const endpoint of smokeEndpoints) {
  51 |     test(`${endpoint.id} - ${endpoint.method} ${endpoint.name}`, async ({ request }, testInfo) => {
  52 |       const timeoutMs = endpoint.method === 'POST' ? 180000 : 60000;
  53 |       test.setTimeout(timeoutMs);
  54 | 
  55 |       let targetUrl: string;
  56 |       try {
  57 |         targetUrl = clinicalNotesUrl(manifest, endpoint);
  58 |       } catch (error) {
  59 |         test.skip(true, (error as Error).message);
  60 |         return;
  61 |       }
  62 | 
  63 |       const headers = resolveEndpointHeaders(endpoint);
  64 | 
  65 |       const options: Parameters<typeof request.fetch>[1] = {
  66 |         method: endpoint.method,
  67 |         headers,
  68 |         timeout: timeoutMs,
  69 |       };
  70 | 
  71 |       if (endpoint.method !== 'GET' && endpoint.method !== 'HEAD' && endpoint.samplePayload !== undefined) {
  72 |         options.data = endpoint.samplePayload;
  73 |       }
  74 | 
  75 |       const response = await request.fetch(targetUrl, options);
  76 |       const body = await readResponseBody(response);
  77 |       const pathOrUrl = endpoint.fullUrl || endpoint.path;
  78 | 
  79 |       await attachApiProof(testInfo, {
  80 |         endpoint: pathOrUrl,
  81 |         method: endpoint.method,
  82 |         status: response.status(),
  83 |         body,
  84 |         url: targetUrl,
  85 |         extra: { id: endpoint.id, name: endpoint.name },
  86 |       });
  87 | 
> 88 |       expect(response.status()).toBe(endpoint.expectedStatus);
     |                                 ^ Error: expect(received).toBe(expected) // Object.is equality
  89 |       assertBody(endpoint, body);
  90 |     });
  91 |   }
  92 | });
  93 | 
```