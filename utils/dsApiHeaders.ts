import * as fs from 'fs';
import * as path from 'path';

export const DS_API_HEADERS_PATH = path.join(__dirname, '../playwright/.auth/ds-api-headers.json');

export function loadDsApiHeaders(): Record<string, Record<string, string>> {
  if (!fs.existsSync(DS_API_HEADERS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(DS_API_HEADERS_PATH, 'utf8')) as Record<string, Record<string, string>>;
  } catch {
    return {};
  }
}

/** Merge new host headers into existing file (discovery runs can be incremental). */
export function saveDsApiHeaders(headersByHost: Record<string, Record<string, string>>) {
  const merged: Record<string, Record<string, string>> = { ...loadDsApiHeaders() };
  for (const [host, headers] of Object.entries(headersByHost)) {
    merged[host] = { ...merged[host], ...headers };
  }
  fs.mkdirSync(path.dirname(DS_API_HEADERS_PATH), { recursive: true });
  fs.writeFileSync(DS_API_HEADERS_PATH, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
}

export function captureRawAuthHeaders(page: import('@playwright/test').Page) {
  const headersByHost: Record<string, Record<string, string>> = {};

  page.on('request', (request) => {
    const url = request.url();
    if (!/uwc\.world|asksam\.com\.au\/api|neograph|stella|agentic|clinical-notes|unitedwecare/i.test(url)) return;

    let host = '';
    try {
      host = new URL(url).host;
    } catch {
      return;
    }

    const headers = request.headers();
    const entry = headersByHost[host] || {};
    if (headers.authorization) entry.authorization = headers.authorization;
    if (headers['x-api-key']) entry['x-api-key'] = headers['x-api-key'];
    if (Object.keys(entry).length > 0) {
      headersByHost[host] = { ...headersByHost[host], ...entry };
    }
  });

  return headersByHost;
}

export function resolveEndpointHeaders(endpoint: {
  host?: string;
  requestHeaders?: Record<string, string>;
}): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(endpoint.requestHeaders || {})) {
    if (value && value !== '<redacted>') headers[key] = value;
  }

  const saved = endpoint.host ? loadDsApiHeaders()[endpoint.host] : undefined;
  if (saved) {
    if (saved.authorization) headers.authorization = saved.authorization;
    if (saved['x-api-key']) headers['x-api-key'] = saved['x-api-key'];
  }

  delete headers.cookie;
  delete headers.Cookie;
  return headers;
}
