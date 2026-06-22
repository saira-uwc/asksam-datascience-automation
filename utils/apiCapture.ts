import type { Page, Response } from '@playwright/test';

const NOISE_HOSTS = [
  'clerk.',
  'stripe.',
  'google-analytics',
  'analytics.google.com',
  'googletagmanager',
  'sentry.io',
  'hotjar',
  'segment.io',
  'facebook.net',
  'doubleclick',
  'copilot.asksam.com.au/assets',
];

const DS_HOST_HINTS = [
  'uwc.world',
  'clinical-notes',
  'on-append',
  'neograph',
  'rag.',
  'stella',
  'agentic',
  'agentic-flow',
  'unitedwecare',
  '/gen-chat',
  '/graph',
  '/alerts',
  '/association',
  '/medication',
  '/comorbid',
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
  if (/copilot\.asksam\.com\.au\/assets\//i.test(url)) return false;
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
    if (NOISE_HOSTS.some((hint) => fullUrl.toLowerCase().includes(hint))) return;

    let pathname = '';
    let host = '';
    try {
      const parsed = new URL(fullUrl);
      host = parsed.host;
      pathname = parsed.pathname;
    } catch {
      return;
    }

    const isDs = isDataScienceApiUrl(fullUrl);
    const isAsksamApi =
      includeAsksamApi &&
      /asksam\.com\.au/i.test(host) &&
      /\/api\b|\/graphql/i.test(pathname);

    if (!isDs && !isAsksamApi) return;

    const path = `${pathname}${new URL(fullUrl).search}`;
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
    const status = response.status();
    try {
      const contentType = response.headers()['content-type'] || '';
      const text = await response.text();
      if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
        responseBody = parseJsonSafe(text);
      } else if (status >= 400 && text) {
        responseBody = text.length > 4000 ? `${text.slice(0, 4000)}...` : text;
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
      responseStatus: status,
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
