# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: asr-api-smoke.spec.ts >> ASR API smoke >> TC_ASR_01 - POST /transcriptions/transcribe-from-url-v2 returns transcription
- Location: tests/asr-api-smoke.spec.ts:12:7

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
  3  |   asrUrl,
  4  |   extractTranscriptionText,
  5  |   ASR_API,
  6  |   postAsrTranscribe,
  7  |   parseAsrResponseBody,
  8  | } from '../utils/asrApi';
  9  | import { attachApiProof } from '../utils/apiProof';
  10 | 
  11 | test.describe('ASR API smoke', () => {
  12 |   test('TC_ASR_01 - POST /transcriptions/transcribe-from-url-v2 returns transcription', async ({
  13 |   }, testInfo) => {
  14 |     test.setTimeout(180000);
  15 | 
  16 |     if (!ASR_API.apiKey) {
  17 |       test.skip(true, 'ASR_API_KEY is required in .env — get x-api-key from the DS team.');
  18 |     }
  19 | 
  20 |     const endpoint = '/transcriptions/transcribe-from-url-v2';
  21 |     const url = asrUrl(endpoint);
  22 |     const { status, bodyText } = postAsrTranscribe();
  23 |     const body = parseAsrResponseBody(bodyText);
  24 | 
  25 |     await attachApiProof(testInfo, {
  26 |       endpoint,
  27 |       method: 'POST',
  28 |       status,
  29 |       body,
  30 |       url,
  31 |       extra: { service: 'ASR', audioUrl: ASR_API.audioUrl, language: ASR_API.language },
  32 |     });
  33 | 
> 34 |     expect(status).toBe(200);
     |                    ^ Error: expect(received).toBe(expected) // Object.is equality
  35 |     expect(body).toMatchObject({ success: true });
  36 |     const text = extractTranscriptionText(body);
  37 |     expect(text.length).toBeGreaterThan(0);
  38 |   });
  39 | });
  40 | 
```