import type { Page, Response } from '@playwright/test';

const NOISE_HOSTS = [
  'clerk.',
  'stripe.',
  'google-analytics',
  'googletagmanager',
  'sentry.io',
  'hotjar',
  'segment.io',
  'facebook.net',
  'doubleclick',
];

const DS_HOST_HINTS = [
  'uwc.world',
  'clinical-notes',
  'on-append',
  'neograph',
  'rag.',
  'asksam.com.au/api',
  '/session-details/',
  '/progress-note/',
  '/prescription/',
  '/case-history/',
  '/followup/',
  '/drugs-labs-disease',
];

export type CapturedApiCall = {
  method: string;
  fullUrl: string;
  host: string;
  path: string;
  requestHeaders: Record<string, string>;
  requestBody?: unknown;
  responseStatus?: number;
  responseBody?: unknown;
  capturedAt: string;
};

function parseJsonSafe(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text.length > 2000 ? `${text.slice(0, 2000)}...` : text;
  }
}

function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (lower === 'authorization' || lower === 'cookie' || lower === 'x-api-key') {
      out[key] = '<redacted>';
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function isDataScienceApiUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (NOISE_HOSTS.some((hint) => lower.includes(hint))) return false;
  return DS_HOST_HINTS.some((hint) => lower.includes(hint));
}

export function attachDataScienceApiCapture(
  page: Page,
  bucket: CapturedApiCall[],
  opts?: { includeAsksamApi?: boolean },
) {
  const includeAsksamApi = opts?.includeAsksamApi ?? true;

  const pending = new Map<
    string,
    { method: string; fullUrl: string; host: string; path: string; headers: Record<string, string>; body?: unknown }
  >();

  page.on('request', (request) => {
    const fullUrl = request.url();
    const isDs = isDataScienceApiUrl(fullUrl);
    const isAsksamApi =
      includeAsksamApi &&
      /asksam\.com\.au/i.test(fullUrl) &&
      /\/api\b|\/graphql|session-details|clinical-notes|transcrib|notetaker/i.test(fullUrl);

    if (!isDs && !isAsksamApi) return;

    let host = '';
    let path = '';
    try {
      const parsed = new URL(fullUrl);
      host = parsed.host;
      path = `${parsed.pathname}${parsed.search}`;
    } catch {
      return;
    }

    const postData = request.postData();
    pending.set(request.url() + request.method(), {
      method: request.method(),
      fullUrl,
      host,
      path,
      headers: redactHeaders(request.headers()),
      body: postData ? parseJsonSafe(postData) : undefined,
    });
  });

  page.on('response', async (response: Response) => {
    const request = response.request();
    const key = request.url() + request.method();
    const meta = pending.get(key);
    if (!meta) return;

    let responseBody: unknown;
    try {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('application/json')) {
        responseBody = parseJsonSafe(await response.text());
      }
    } catch {
      responseBody = undefined;
    }

    bucket.push({
      method: meta.method,
      fullUrl: meta.fullUrl,
      host: meta.host,
      path: meta.path,
      requestHeaders: meta.headers,
      requestBody: meta.body,
      responseStatus: response.status(),
      responseBody,
      capturedAt: new Date().toISOString(),
    });

    pending.delete(key);
  });
}

export function dedupeCapturedCalls(calls: CapturedApiCall[]): CapturedApiCall[] {
  const seen = new Set<string>();
  const out: CapturedApiCall[] = [];
  for (const call of calls) {
    const key = `${call.method} ${call.host} ${call.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(call);
  }
  return out;
}
