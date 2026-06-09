import { test, expect } from '@playwright/test';
import {
  ragUrl,
  buildGenChatPayload,
  extractGenChatContent,
} from '../utils/ragApi';

test.describe('RAG API smoke', () => {
  test('TC_API_01 - GET /health returns application healthy', async ({ request }) => {
    const response = await request.get(ragUrl('/health'));
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({ Health: 'Ok' });
  });

  test('TC_API_02 - GET /redis/health returns Redis healthy', async ({ request }) => {
    const response = await request.get(ragUrl('/redis/health'));
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(String(body.detail || '')).toMatch(/redis/i);
  });

  test('TC_API_03 - GET /vectorstore/health returns vector store healthy', async ({
    request,
  }) => {
    const response = await request.get(ragUrl('/vectorstore/health'));
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({ Health: 'Ok' });
  });

  test('TC_API_04 - POST /gen-chat returns LLM response', async ({ request }) => {
    test.setTimeout(120000);

    const response = await request.post(ragUrl('/gen-chat'), {
      data: buildGenChatPayload(),
    });
    expect(response.status()).toBe(200);

    const body = await response.json();
    const content = extractGenChatContent(body);
    expect(content.length).toBeGreaterThan(0);
    expect(body).toHaveProperty('user_id');
  });
});
