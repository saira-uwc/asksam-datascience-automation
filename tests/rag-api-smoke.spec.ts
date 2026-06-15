import { test, expect } from '@playwright/test';
import {
  ragUrl,
  buildGenChatPayload,
  extractGenChatContent,
} from '../utils/ragApi';
import { readResponseBody, attachApiProof } from '../utils/apiProof';

test.describe('RAG API smoke', () => {
  test('TC_API_01 - GET /health returns application healthy', async ({ request }, testInfo) => {
    const endpoint = '/health';
    const url = ragUrl(endpoint);
    const response = await request.get(url);
    const body = await readResponseBody(response);

    await attachApiProof(testInfo, { endpoint, method: 'GET', status: response.status(), body, url });

    expect(response.status()).toBe(200);
    expect(body).toMatchObject({ Health: 'Ok' });
  });

  test('TC_API_02 - GET /redis/health returns Redis healthy', async ({ request }, testInfo) => {
    const endpoint = '/redis/health';
    const url = ragUrl(endpoint);
    const response = await request.get(url);
    const body = await readResponseBody(response);

    await attachApiProof(testInfo, { endpoint, method: 'GET', status: response.status(), body, url });

    expect(response.status()).toBe(200);
    expect(body).toMatchObject({ status: 'healthy' });
    expect(String((body as Record<string, unknown>).detail || '')).toMatch(/redis/i);
  });

  test('TC_API_03 - GET /vectorstore/health returns vector store healthy', async ({
    request,
  }, testInfo) => {
    const endpoint = '/vectorstore/health';
    const url = ragUrl(endpoint);
    const response = await request.get(url);
    const body = await readResponseBody(response);

    await attachApiProof(testInfo, { endpoint, method: 'GET', status: response.status(), body, url });

    expect(response.status()).toBe(200);
    expect(body).toMatchObject({ Health: 'Ok' });
  });

  test('TC_API_04 - POST /gen-chat returns LLM response', async ({ request }, testInfo) => {
    test.setTimeout(120000);

    const endpoint = '/gen-chat';
    const url = ragUrl(endpoint);
    const response = await request.post(url, {
      data: buildGenChatPayload(),
    });
    const body = await readResponseBody(response);

    await attachApiProof(testInfo, { endpoint, method: 'POST', status: response.status(), body, url });

    expect(response.status()).toBe(200);
    const content = extractGenChatContent(body);
    expect(content.length).toBeGreaterThan(0);
    expect(body).toHaveProperty('user_id');
  });
});
