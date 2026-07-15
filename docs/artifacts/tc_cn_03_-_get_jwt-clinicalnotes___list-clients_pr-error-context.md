# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: clinical-notes-api-smoke.spec.ts >> Clinical Notes API smoke >> TC_CN_03 - GET jwt-clinicalnotes / list-clients?professional_id=152853&count=200
- Location: tests/clinical-notes-api-smoke.spec.ts:51:9

# Error details

```
Test timeout of 60000ms exceeded.
```

```
TimeoutError: apiRequestContext.fetch: Timeout 60000ms exceeded.
Call log:
  - → GET https://session-note.uwc.world/jwt-clinicalnotes/list-clients?professional_id=152853&count=200
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.96 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br
    - sec-ch-ua-platform: "Windows"
    - referer: https://copilot.asksam.com.au/
    - accept-language: en-US
    - sec-ch-ua: "Not/A)Brand";v="99", "Chromium";v="148"
    - sec-ch-ua-mobile: ?0
    - content-type: application/json
    - authorization: Bearer eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDExMUFBQSIsImtpZCI6Imluc18ydk9pZVpHanJhQXVKckJZMVhlRzI3cFJLUm4iLCJvaWF0IjoxNzgxNTExMTA1LCJ0eXAiOiJKV1QifQ.eyJhenAiOiJodHRwczovL2NvcGlsb3QuYXNrc2FtLmNvbS5hdSIsImNyZWF0ZWRfYXQiOjE3NDc3OTQwMTcsImVtYWlsIjoiZS5jbGluaWNpYW50ZXN0dXNlckBhc2tzYW0uY29tLmF1IiwiZXhwIjoxNzgxNTExMTY1LCJleHRlcm5hbF9pZCI6IjE1Mjg1MyIsImZpcnN0X25hbWUiOiJBbnRob255IiwiZnZhIjpbMCwtMV0sImlhdCI6MTc4MTUxMTEwNSwiaW1hZ2VfdXJsIjoiaHR0cHM6Ly9pbWcuY2xlcmsuY29tL2V5SjBlWEJsSWpvaWNISnZlSGtpTENKemNtTWlPaUpvZEhSd2N6b3ZMMmx0WVdkbGN5NWpiR1Z5YXk1a1pYWXZkWEJzYjJGa1pXUXZhVzFuWHpNMVVGWm9NSGczUWsxeVdGcEdZM0E0VlVKV2NGSk9TVFJMWVNKOSIsImlzcyI6Imh0dHBzOi8vY2xlcmsuYXNrc2FtLmNvbS5hdSIsImp0aSI6IjI2MjgwYjkxMGFlM2Y0MjZkYjhlIiwibGFzdF9uYW1lIjoiU21pdGgiLCJsYXN0X3NpZ25faW5fYXQiOjE3ODE1MTEwNTUsIm5iZiI6MTc4MTUxMTA5NSwicGhvbmUiOiIrNjE0MTM4MDEzODQiLCJwdWJsaWNfbWV0YWRhdGEiOnsiYWRtaW4iOnRydWUsImRpc2NsYWltZXJfYWNjZXB0ZWQiOnRydWV9LCJzaWQiOiJzZXNzXzNGQUhmUElSSmxnMFBYdk9SemwzTW9mbXBEVCIsInN0cyI6ImFjdGl2ZSIsInN1YiI6InVzZXJfMnhPMHNGcFVxYW5ZVFh4d1FvY2l3cVVTNzNSIiwidW5zYWZlX21ldGFkYXRhIjp7ImNvdW50cnkiOiJBdXN0cmFsaWEiLCJ0aW1lWm9uZSI6IkF1c3RyYWxpYS9TeWRuZXkiLCJ0b3VyR3VpZCI6eyJmbGFnIjp0cnVlLCJzdGF0dXMiOnsiY3JlYXRlQ2xpbmljYWxOb3RlIjpmYWxzZSwiY3JlYXRlUGF0aWVudCI6dHJ1ZSwiZ3JlZW5CdXR0b24iOnRydWUsIm1pY0J1dHRvbiI6dHJ1ZSwicmFpc2VUaWNrZXQiOnRydWUsInNpZGVNZW51IjpmYWxzZX19fSwidXBkYXRlZF9hdCI6MTc4MTUxMTA1NSwidXNlcl9pZCI6InVzZXJfMnhPMHNGcFVxYW5ZVFh4d1FvY2l3cVVTNzNSIiwidiI6Mn0.rxsHhKvo11r9D_-jC0aeNFuh9gZDwnCJRduo8CShppeCCJhcx9WikEARH9RDbLvUHBUggez9jz-eJFOylnVipSuHWHwep6Ptn9yVCX9EY8Sn-RpQ3O4n235uMobDa5EuA186YlJMqArOlSsOCxt2uNzIrfGDx8wUXiX7OwORc29G7276F60rrPPaLzq3VPBliNsXrR1IKj3plWz7L0LxqpwfYecefBFSCjcPOwZwDxiD17FtL0DCgJSX2zkZQGcsFGN6Bb3oi0UMoX_HiWFkz1Gqa5trllck7dsYn82nmb2oX-YZ5_5HbyCImchYh-erRZGqHYHlOpQ417FxSd7U_w
    - x-api-key: 76d802e426a2cb28f3760c8c8f669983f67ed775

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
> 75 |       const response = await request.fetch(targetUrl, options);
     |                                      ^ TimeoutError: apiRequestContext.fetch: Timeout 60000ms exceeded.
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
  88 |       expect(response.status()).toBe(endpoint.expectedStatus);
  89 |       assertBody(endpoint, body);
  90 |     });
  91 |   }
  92 | });
  93 | 
```