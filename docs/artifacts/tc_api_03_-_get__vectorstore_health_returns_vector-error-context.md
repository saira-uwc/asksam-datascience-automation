# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rag-api-smoke.spec.ts >> RAG API smoke >> TC_API_03 - GET /vectorstore/health returns vector store healthy
- Location: tests/rag-api-smoke.spec.ts:51:7

# Error details

```
TimeoutError: apiRequestContext.get: Timeout 30000ms exceeded.
Call log:
  - → GET https://rag.uwc.world/vectorstore/health
    - user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import type { APIResponse, TestInfo } from '@playwright/test';
  3  | import {
  4  |   ragUrl,
  5  |   buildGenChatPayload,
  6  |   extractGenChatContent,
  7  |   formatApiProof,
  8  | } from '../utils/ragApi';
  9  | 
  10 | async function attachApiProof(
  11 |   testInfo: TestInfo,
  12 |   endpoint: string,
  13 |   method: string,
  14 |   response: APIResponse,
  15 |   body: unknown,
  16 | ) {
  17 |   const proof = formatApiProof({
  18 |     endpoint,
  19 |     method,
  20 |     status: response.status(),
  21 |     body,
  22 |   });
  23 |   await testInfo.attach('api-response', {
  24 |     body: JSON.stringify(proof, null, 2),
  25 |     contentType: 'application/json',
  26 |   });
  27 | }
  28 | 
  29 | test.describe('RAG API smoke', () => {
  30 |   test('TC_API_01 - GET /health returns application healthy', async ({ request }, testInfo) => {
  31 |     const endpoint = '/health';
  32 |     const response = await request.get(ragUrl(endpoint));
  33 |     const body = await response.json();
  34 | 
  35 |     expect(response.status()).toBe(200);
  36 |     expect(body).toMatchObject({ Health: 'Ok' });
  37 |     await attachApiProof(testInfo, endpoint, 'GET', response, body);
  38 |   });
  39 | 
  40 |   test('TC_API_02 - GET /redis/health returns Redis healthy', async ({ request }, testInfo) => {
  41 |     const endpoint = '/redis/health';
  42 |     const response = await request.get(ragUrl(endpoint));
  43 |     const body = await response.json();
  44 | 
  45 |     expect(response.status()).toBe(200);
  46 |     expect(body.status).toBe('healthy');
  47 |     expect(String(body.detail || '')).toMatch(/redis/i);
  48 |     await attachApiProof(testInfo, endpoint, 'GET', response, body);
  49 |   });
  50 | 
  51 |   test('TC_API_03 - GET /vectorstore/health returns vector store healthy', async ({
  52 |     request,
  53 |   }, testInfo) => {
  54 |     const endpoint = '/vectorstore/health';
> 55 |     const response = await request.get(ragUrl(endpoint));
     |                                    ^ TimeoutError: apiRequestContext.get: Timeout 30000ms exceeded.
  56 |     const body = await response.json();
  57 | 
  58 |     expect(response.status()).toBe(200);
  59 |     expect(body).toMatchObject({ Health: 'Ok' });
  60 |     await attachApiProof(testInfo, endpoint, 'GET', response, body);
  61 |   });
  62 | 
  63 |   test('TC_API_04 - POST /gen-chat returns LLM response', async ({ request }, testInfo) => {
  64 |     test.setTimeout(120000);
  65 | 
  66 |     const endpoint = '/gen-chat';
  67 |     const response = await request.post(ragUrl(endpoint), {
  68 |       data: buildGenChatPayload(),
  69 |     });
  70 |     const body = await response.json();
  71 | 
  72 |     expect(response.status()).toBe(200);
  73 |     const content = extractGenChatContent(body);
  74 |     expect(content.length).toBeGreaterThan(0);
  75 |     expect(body).toHaveProperty('user_id');
  76 |     await attachApiProof(testInfo, endpoint, 'POST', response, body);
  77 |   });
  78 | });
  79 | 
```