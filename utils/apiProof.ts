import type { APIResponse, TestInfo } from '@playwright/test';
import { formatApiProof } from './ragApi';

const MAX_BODY_CHARS = 8000;

function truncateBody(text: string): string {
  if (text.length <= MAX_BODY_CHARS) return text;
  return `${text.substring(0, MAX_BODY_CHARS)}... [truncated ${text.length - MAX_BODY_CHARS} chars]`;
}

/** Read response body as JSON when possible; otherwise return raw text (e.g. 502 HTML). */
export async function readResponseBody(response: APIResponse): Promise<unknown> {
  const text = await response.text();
  if (!text) return '';

  const contentType = response.headers()['content-type'] || '';
  const trimmed = text.trim();
  const looksJson =
    contentType.includes('application/json') ||
    trimmed.startsWith('{') ||
    trimmed.startsWith('[');

  if (looksJson) {
    try {
      return JSON.parse(text);
    } catch {
      return truncateBody(text);
    }
  }

  return truncateBody(text);
}

export type ApiProofInput = {
  endpoint: string;
  method: string;
  status: number;
  body: unknown;
  url?: string;
  extra?: Record<string, unknown>;
};

/** Attach API response proof before assertions so pass and fail both retain the payload. */
export async function attachApiProof(testInfo: TestInfo, opts: ApiProofInput): Promise<void> {
  const { extra, ...formatOpts } = opts;
  const proof = { ...formatApiProof(formatOpts), ...extra };
  await testInfo.attach('api-response', {
    body: JSON.stringify(proof, null, 2),
    contentType: 'application/json',
  });
}
