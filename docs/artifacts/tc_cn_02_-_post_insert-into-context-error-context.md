# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: clinical-notes-api-smoke.spec.ts >> Clinical Notes API smoke >> TC_CN_02 - POST insert-into-context
- Location: tests/clinical-notes-api-smoke.spec.ts:83:9

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 502
```

# Test source

```ts
  10  |   DS_API_HEADERS_PATH,
  11  |   type ClinicalNotesEndpoint,
  12  | } from '../utils/clinicalNotesApi';
  13  | 
  14  | async function attachApiProof(
  15  |   testInfo: TestInfo,
  16  |   endpoint: ClinicalNotesEndpoint,
  17  |   response: APIResponse,
  18  |   body: unknown,
  19  | ) {
  20  |   const proof = formatClinicalNotesApiProof({
  21  |     endpoint,
  22  |     status: response.status(),
  23  |     body,
  24  |   });
  25  |   await testInfo.attach('api-response', {
  26  |     body: JSON.stringify(proof, null, 2),
  27  |     contentType: 'application/json',
  28  |   });
  29  | }
  30  | 
  31  | async function readResponseBody(response: APIResponse): Promise<unknown> {
  32  |   const contentType = response.headers()['content-type'] || '';
  33  |   const text = await response.text();
  34  |   if (!text) return '';
  35  |   if (contentType.includes('application/json')) {
  36  |     try {
  37  |       return JSON.parse(text);
  38  |     } catch {
  39  |       return text;
  40  |     }
  41  |   }
  42  |   return text;
  43  | }
  44  | 
  45  | function assertBody(endpoint: ClinicalNotesEndpoint, body: unknown) {
  46  |   if (endpoint.bodyMatch && body && typeof body === 'object') {
  47  |     expect(body).toMatchObject(endpoint.bodyMatch);
  48  |   }
  49  |   if (endpoint.bodyContains?.length) {
  50  |     const serialized = JSON.stringify(body).toLowerCase();
  51  |     for (const fragment of endpoint.bodyContains) {
  52  |       expect(serialized).toContain(fragment.toLowerCase());
  53  |     }
  54  |   }
  55  | }
  56  | 
  57  | test.describe('Clinical Notes API smoke', () => {
  58  |   const manifest = loadClinicalNotesManifest();
  59  |   const smokeEndpoints = getSmokeEndpoints(manifest);
  60  |   const dsApiHeaders = loadDsApiHeaders();
  61  | 
  62  |   if (Object.keys(dsApiHeaders).length === 0) {
  63  |     test('TC_CN_00 - auth headers pending', async () => {
  64  |       test.skip(
  65  |         true,
  66  |         `Missing ${DS_API_HEADERS_PATH} — scp from discovery machine or run: npm run discover:clinical-notes-apis`,
  67  |       );
  68  |     });
  69  |     return;
  70  |   }
  71  | 
  72  |   if (smokeEndpoints.length === 0) {
  73  |     test('TC_CN_00 - manifest pending discovery', async () => {
  74  |       test.skip(
  75  |         true,
  76  |         'No smoke endpoints in fixtures/clinical-notes-apis.json — run: npm run discover:clinical-notes-apis',
  77  |       );
  78  |     });
  79  |     return;
  80  |   }
  81  | 
  82  |   for (const endpoint of smokeEndpoints) {
  83  |     test(`${endpoint.id} - ${endpoint.method} ${endpoint.name}`, async ({ request }, testInfo) => {
  84  |       const timeoutMs = endpoint.method === 'POST' ? 180000 : 60000;
  85  |       test.setTimeout(timeoutMs);
  86  | 
  87  |       let targetUrl: string;
  88  |       try {
  89  |         targetUrl = clinicalNotesUrl(manifest, endpoint);
  90  |       } catch (error) {
  91  |         test.skip(true, (error as Error).message);
  92  |         return;
  93  |       }
  94  | 
  95  |       const headers = resolveEndpointHeaders(endpoint);
  96  | 
  97  |       const options: Parameters<typeof request.fetch>[1] = {
  98  |         method: endpoint.method,
  99  |         headers,
  100 |         timeout: timeoutMs,
  101 |       };
  102 | 
  103 |       if (endpoint.method !== 'GET' && endpoint.method !== 'HEAD' && endpoint.samplePayload !== undefined) {
  104 |         options.data = endpoint.samplePayload;
  105 |       }
  106 | 
  107 |       const response = await request.fetch(targetUrl, options);
  108 |       const body = await readResponseBody(response);
  109 | 
> 110 |       expect(response.status()).toBe(endpoint.expectedStatus);
      |                                 ^ Error: expect(received).toBe(expected) // Object.is equality
  111 |       assertBody(endpoint, body);
  112 |       await attachApiProof(testInfo, endpoint, response, body);
  113 |     });
  114 |   }
  115 | });
  116 | 
```