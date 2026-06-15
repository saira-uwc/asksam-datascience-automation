# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rag-api-smoke.spec.ts >> RAG API smoke >> TC_API_03 - GET /vectorstore/health returns vector store healthy
- Location: tests/rag-api-smoke.spec.ts:35:7

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
  3  |   ragUrl,
  4  |   buildGenChatPayload,
  5  |   extractGenChatContent,
  6  | } from '../utils/ragApi';
  7  | import { readResponseBody, attachApiProof } from '../utils/apiProof';
  8  | 
  9  | test.describe('RAG API smoke', () => {
  10 |   test('TC_API_01 - GET /health returns application healthy', async ({ request }, testInfo) => {
  11 |     const endpoint = '/health';
  12 |     const url = ragUrl(endpoint);
  13 |     const response = await request.get(url);
  14 |     const body = await readResponseBody(response);
  15 | 
  16 |     await attachApiProof(testInfo, { endpoint, method: 'GET', status: response.status(), body, url });
  17 | 
  18 |     expect(response.status()).toBe(200);
  19 |     expect(body).toMatchObject({ Health: 'Ok' });
  20 |   });
  21 | 
  22 |   test('TC_API_02 - GET /redis/health returns Redis healthy', async ({ request }, testInfo) => {
  23 |     const endpoint = '/redis/health';
  24 |     const url = ragUrl(endpoint);
  25 |     const response = await request.get(url);
  26 |     const body = await readResponseBody(response);
  27 | 
  28 |     await attachApiProof(testInfo, { endpoint, method: 'GET', status: response.status(), body, url });
  29 | 
  30 |     expect(response.status()).toBe(200);
  31 |     expect(body).toMatchObject({ status: 'healthy' });
  32 |     expect(String((body as Record<string, unknown>).detail || '')).toMatch(/redis/i);
  33 |   });
  34 | 
  35 |   test('TC_API_03 - GET /vectorstore/health returns vector store healthy', async ({
  36 |     request,
  37 |   }, testInfo) => {
  38 |     const endpoint = '/vectorstore/health';
  39 |     const url = ragUrl(endpoint);
  40 |     const response = await request.get(url);
  41 |     const body = await readResponseBody(response);
  42 | 
  43 |     await attachApiProof(testInfo, { endpoint, method: 'GET', status: response.status(), body, url });
  44 | 
> 45 |     expect(response.status()).toBe(200);
     |                               ^ Error: expect(received).toBe(expected) // Object.is equality
  46 |     expect(body).toMatchObject({ Health: 'Ok' });
  47 |   });
  48 | 
  49 |   test('TC_API_04 - POST /gen-chat returns LLM response', async ({ request }, testInfo) => {
  50 |     test.setTimeout(120000);
  51 | 
  52 |     const endpoint = '/gen-chat';
  53 |     const url = ragUrl(endpoint);
  54 |     const response = await request.post(url, {
  55 |       data: buildGenChatPayload(),
  56 |     });
  57 |     const body = await readResponseBody(response);
  58 | 
  59 |     await attachApiProof(testInfo, { endpoint, method: 'POST', status: response.status(), body, url });
  60 | 
  61 |     expect(response.status()).toBe(200);
  62 |     const content = extractGenChatContent(body);
  63 |     expect(content.length).toBeGreaterThan(0);
  64 |     expect(body).toHaveProperty('user_id');
  65 |   });
  66 | });
  67 | 
```