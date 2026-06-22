import { test, expect } from '@playwright/test';
import {
  asrUrl,
  extractTranscriptionText,
  ASR_API,
  postAsrTranscribe,
  parseAsrResponseBody,
} from '../utils/asrApi';
import { attachApiProof } from '../utils/apiProof';

test.describe('ASR API smoke', () => {
  test('TC_ASR_01 - POST /transcriptions/transcribe-from-url-v2 returns transcription', async ({
  }, testInfo) => {
    test.setTimeout(180000);

    if (!ASR_API.apiKey) {
      test.skip(true, 'ASR_API_KEY is required in .env — get x-api-key from the DS team.');
    }

    const endpoint = '/transcriptions/transcribe-from-url-v2';
    const url = asrUrl(endpoint);
    const { status, bodyText } = postAsrTranscribe();
    const body = parseAsrResponseBody(bodyText);

    await attachApiProof(testInfo, {
      endpoint,
      method: 'POST',
      status,
      body,
      url,
      extra: { service: 'ASR', audioUrl: ASR_API.audioUrl, language: ASR_API.language },
    });

    expect(status).toBe(200);
    expect(body).toMatchObject({ success: true });
    const text = extractTranscriptionText(body);
    expect(text.length).toBeGreaterThan(0);
  });
});
