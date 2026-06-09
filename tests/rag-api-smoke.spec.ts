import { test, expect } from '@playwright/test';
import type { APIResponse, TestInfo } from '@playwright/test';
import {
  ragUrl,
  buildGenChatPayload,
  extractGenChatContent,
  formatApiProof,
} from '../utils/ragApi';

async function attachApiProof(
  testInfo: TestInfo,
  endpoint: string,
  method: string,
  response: APIResponse,
  body: unknown,
) {
  const proof = formatApiProof({
    endpoint,
    method,
    status: response.status(),
    body,
  });
  await testInfo.attach('api-response', {
    body: JSON.stringify(proof, null, 2),
    contentType: 'application/json',
  });
}

test.describe('RAG API smoke', () => {
  test('TC_API_01 - GET /health returns application healthy', async ({ request }, testInfo) => {
    const endpoint = '/health';
    const response = await request.get(ragUrl(endpoint));
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body).toMatchObject({ Health: 'Ok' });
    await attachApiProof(testInfo, endpoint, 'GET', response, body);
  });

  test('TC_API_02 - GET /redis/health returns Redis healthy', async ({ request }, testInfo) => {
    const endpoint = '/redis/health';
    const response = await request.get(ragUrl(endpoint));
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body.status).toBe('healthy');
    expect(String(body.detail || '')).toMatch(/redis/i);
    await attachApiProof(testInfo, endpoint, 'GET', response, body);
  });

  test('TC_API_03 - GET /vectorstore/health returns vector store healthy', async ({
    request,
  }, testInfo) => {
    const endpoint = '/vectorstore/health';
    const response = await request.get(ragUrl(endpoint));
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body).toMatchObject({ Health: 'Ok' });
    await attachApiProof(testInfo, endpoint, 'GET', response, body);
  });

  test('TC_API_04 - POST /gen-chat returns LLM response', async ({ request }, testInfo) => {
    test.setTimeout(120000);

    const endpoint = '/gen-chat';
    const response = await request.post(ragUrl(endpoint), {
      data: buildGenChatPayload(),
    });
    const body = await response.json();

    expect(response.status()).toBe(200);
    const content = extractGenChatContent(body);
    expect(content.length).toBeGreaterThan(0);
    expect(body).toHaveProperty('user_id');
    await attachApiProof(testInfo, endpoint, 'POST', response, body);
  });
});
