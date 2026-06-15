import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import type { CapturedApiCall } from './apiCapture';
import { formatApiProof } from './ragApi';
import {
  DS_API_HEADERS_PATH,
  loadDsApiHeaders,
  saveDsApiHeaders,
  resolveEndpointHeaders,
} from './dsApiHeaders';

dotenv.config();

export const MANIFEST_PATH = path.join(__dirname, '../fixtures/clinical-notes-apis.json');
export { DS_API_HEADERS_PATH, loadDsApiHeaders, saveDsApiHeaders, resolveEndpointHeaders };

const SMOKE_PATH_PATTERNS = [
  '/health',
  '/static/countries',
  '/jwt-clinicalnotes/list-clients',
  '/transcription-file-analyzer/process-document',
  '/append-to-context-v4',
  '/insert-into-context',
  '/session-details/progress-note/',
  '/session_summary/',
  '/chief_complaints/',
  '/drugs_ner/',
];

export type ClinicalNotesEndpoint = {
  id: string;
  name: string;
  method: string;
  path: string;
  fullUrl?: string;
  host?: string;
  via: 'direct' | 'proxied';
  smoke: boolean;
  expectedStatus: number;
  requestHeaders?: Record<string, string>;
  samplePayload?: unknown;
  bodyMatch?: Record<string, unknown>;
  bodyContains?: string[];
  discoveredFrom?: string;
};

export type ClinicalNotesApiManifest = {
  version: 1;
  discoveredAt: string | null;
  discoverySource: 'manual' | 'prod-copilot-ui';
  baseUrl: string;
  endpoints: ClinicalNotesEndpoint[];
};

const DEFAULT_MANIFEST: ClinicalNotesApiManifest = {
  version: 1,
  discoveredAt: null,
  discoverySource: 'manual',
  baseUrl: process.env.CLINICAL_NOTES_API_BASE_URL || '',
  endpoints: [],
};

function slugifyPath(pathname: string): string {
  return pathname
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .slice(0, 48);
}

function isDirectClinicalNotesHost(host: string): boolean {
  return /clinical-notes|uwc\.world/i.test(host) && !/clerk|stripe/i.test(host);
}

function shouldSmokeEndpoint(call: CapturedApiCall): boolean {
  if (call.responseStatus && call.responseStatus >= 400) return false;
  const pathLower = call.path.toLowerCase();
  return SMOKE_PATH_PATTERNS.some((hint) => pathLower.includes(hint));
}

function endpointNameFromCall(call: CapturedApiCall): string {
  if (/\/health\b/i.test(call.path)) return 'Application health';
  const parts = call.path.split('/').filter(Boolean);
  return parts.slice(-2).join(' / ') || call.path;
}

export function loadClinicalNotesManifest(): ClinicalNotesApiManifest {
  if (!fs.existsSync(MANIFEST_PATH)) return { ...DEFAULT_MANIFEST };
  try {
    const raw = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as ClinicalNotesApiManifest;
    return {
      ...DEFAULT_MANIFEST,
      ...raw,
      endpoints: Array.isArray(raw.endpoints) ? raw.endpoints : [],
    };
  } catch {
    return { ...DEFAULT_MANIFEST };
  }
}

export function saveClinicalNotesManifest(manifest: ClinicalNotesApiManifest) {
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

export function buildManifestFromCapture(calls: CapturedApiCall[]): ClinicalNotesApiManifest {
  const successful = calls.filter((call) => (call.responseStatus || 0) < 400);
  const candidates = successful.length > 0 ? successful : calls;

  const hostCounts = new Map<string, number>();
  for (const call of candidates) {
    if (!isDirectClinicalNotesHost(call.host)) continue;
    hostCounts.set(call.host, (hostCounts.get(call.host) || 0) + 1);
  }

  let baseUrl = process.env.CLINICAL_NOTES_API_BASE_URL || '';
  if (hostCounts.size > 0) {
    const topHost = [...hostCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    baseUrl = `https://${topHost}`;
  }

  const endpoints: ClinicalNotesEndpoint[] = [];
  const seen = new Set<string>();
  let smokeIndex = 1;

  const ordered = [...candidates].sort((a, b) => {
    const aHealth = /\/health\b/i.test(a.path) ? 0 : 1;
    const bHealth = /\/health\b/i.test(b.path) ? 0 : 1;
    return aHealth - bHealth || a.path.localeCompare(b.path);
  });

  for (const call of ordered) {
    const key = `${call.method} ${call.host} ${call.path}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const via: 'direct' | 'proxied' = isDirectClinicalNotesHost(call.host) ? 'direct' : 'proxied';
    const smoke = shouldSmokeEndpoint(call);
    const id = smoke ? `TC_CN_${String(smokeIndex++).padStart(2, '0')}` : `CAPTURED_${slugifyPath(call.path)}`;

    const endpoint: ClinicalNotesEndpoint = {
      id,
      name: endpointNameFromCall(call),
      method: call.method,
      path: call.path,
      fullUrl: call.fullUrl,
      host: call.host,
      via,
      smoke,
      expectedStatus: call.responseStatus && call.responseStatus < 400 ? call.responseStatus : 200,
      requestHeaders: call.requestHeaders,
      discoveredFrom: 'prod-copilot-ui',
    };

    if (call.requestBody !== undefined) {
      endpoint.samplePayload = call.requestBody;
    }

    if (call.method === 'GET' && /\/health\b/i.test(call.path) && call.responseBody && typeof call.responseBody === 'object') {
      endpoint.bodyMatch = call.responseBody as Record<string, unknown>;
    }

    endpoints.push(endpoint);
  }

  return {
    version: 1,
    discoveredAt: new Date().toISOString(),
    discoverySource: 'prod-copilot-ui',
    baseUrl,
    endpoints,
  };
}

export function clinicalNotesUrl(manifest: ClinicalNotesApiManifest, endpoint: ClinicalNotesEndpoint): string {
  if (endpoint.fullUrl) return endpoint.fullUrl;
  const base = (manifest.baseUrl || process.env.CLINICAL_NOTES_API_BASE_URL || '').replace(/\/$/, '');
  if (!base) throw new Error('Clinical Notes baseUrl missing — run discover:clinical-notes-apis first');
  return `${base}${endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`}`;
}

export function getSmokeEndpoints(manifest: ClinicalNotesApiManifest): ClinicalNotesEndpoint[] {
  return manifest.endpoints.filter((endpoint) => endpoint.smoke);
}

export function formatClinicalNotesApiProof(opts: {
  endpoint: ClinicalNotesEndpoint;
  status: number;
  body: unknown;
}): Record<string, unknown> {
  const pathOrUrl = opts.endpoint.fullUrl || opts.endpoint.path;
  return formatApiProof({
    endpoint: pathOrUrl,
    method: opts.endpoint.method,
    status: opts.status,
    body: opts.body,
  });
}

export { formatApiProof };
