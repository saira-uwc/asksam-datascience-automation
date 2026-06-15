# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: assistant-api-smoke.spec.ts >> Assistant panel API smoke >> TC_AST_AS_01 - GET [assistant] Assistant — 152853 / drug_drug_interaction_alerts
- Location: tests/assistant-api-smoke.spec.ts:83:9

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 403
```

# Test source

```ts
  11  | } from '../utils/assistantApi';
  12  | import { loadDsApiHeaders, DS_API_HEADERS_PATH } from '../utils/dsApiHeaders';
  13  | 
  14  | async function attachApiProof(
  15  |   testInfo: TestInfo,
  16  |   endpoint: AssistantEndpoint,
  17  |   response: APIResponse,
  18  |   body: unknown,
  19  | ) {
  20  |   const proof = formatAssistantApiProof({
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
  45  | function assertBody(endpoint: AssistantEndpoint, body: unknown) {
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
  57  | test.describe('Assistant panel API smoke', () => {
  58  |   const manifest = loadAssistantManifest();
  59  |   const smokeEndpoints = getAssistantSmokeEndpoints(manifest);
  60  |   const dsApiHeaders = loadDsApiHeaders();
  61  | 
  62  |   if (Object.keys(dsApiHeaders).length === 0) {
  63  |     test('TC_AST_00 - auth headers pending', async () => {
  64  |       test.skip(
  65  |         true,
  66  |         `Missing ${DS_API_HEADERS_PATH} — run: npm run discover:assistant-apis`,
  67  |       );
  68  |     });
  69  |     return;
  70  |   }
  71  | 
  72  |   if (smokeEndpoints.length === 0) {
  73  |     test('TC_AST_00 - manifest pending discovery', async () => {
  74  |       test.skip(
  75  |         true,
  76  |         `No smoke endpoints in ${MANIFEST_PATH} — run: npm run discover:assistant-apis`,
  77  |       );
  78  |     });
  79  |     return;
  80  |   }
  81  | 
  82  |   for (const endpoint of smokeEndpoints) {
  83  |     test(`${endpoint.id} - ${endpoint.method} [${endpoint.tab}] ${endpoint.name}`, async ({
  84  |       request,
  85  |     }, testInfo) => {
  86  |       const timeoutMs = endpoint.method === 'POST' ? 180000 : 60000;
  87  |       test.setTimeout(timeoutMs);
  88  | 
  89  |       let targetUrl: string;
  90  |       try {
  91  |         targetUrl = assistantUrl(manifest, endpoint);
  92  |       } catch (error) {
  93  |         test.skip(true, (error as Error).message);
  94  |         return;
  95  |       }
  96  | 
  97  |       const headers = resolveEndpointHeaders(endpoint);
  98  |       const options: Parameters<typeof request.fetch>[1] = {
  99  |         method: endpoint.method,
  100 |         headers,
  101 |         timeout: timeoutMs,
  102 |       };
  103 | 
  104 |       if (endpoint.method !== 'GET' && endpoint.method !== 'HEAD' && endpoint.samplePayload !== undefined) {
  105 |         options.data = endpoint.samplePayload;
  106 |       }
  107 | 
  108 |       const response = await request.fetch(targetUrl, options);
  109 |       const body = await readResponseBody(response);
  110 | 
> 111 |       expect(response.status()).toBe(endpoint.expectedStatus);
      |                                 ^ Error: expect(received).toBe(expected) // Object.is equality
  112 |       assertBody(endpoint, body);
  113 |       await attachApiProof(testInfo, endpoint, response, body);
  114 |     });
  115 |   }
  116 | });
  117 | 
```