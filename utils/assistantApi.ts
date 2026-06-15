import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import type { CapturedApiCall } from './apiCapture';
import { formatApiProof } from './ragApi';
import { resolveEndpointHeaders } from './dsApiHeaders';

dotenv.config();

export const MANIFEST_PATH = path.join(__dirname, '../fixtures/assistant-apis.json');

export type AssistantTab = 'graph' | 'assistant' | 'asksam' | 'panel';

export type TaggedCapturedApiCall = CapturedApiCall & { tab?: AssistantTab };

export type AssistantEndpoint = {
  id: string;
  name: string;
  method: string;
  path: string;
  fullUrl?: string;
  host?: string;
  tab: AssistantTab;
  smoke: boolean;
  expectedStatus: number;
  requestHeaders?: Record<string, string>;
  samplePayload?: unknown;
  bodyMatch?: Record<string, unknown>;
  bodyContains?: string[];
  discoveredFrom?: string;
};

export type AssistantApiManifest = {
  version: 1;
  discoveredAt: string | null;
  discoverySource: 'manual' | 'prod-copilot-assistant-panel';
  baseUrl: string;
  endpoints: AssistantEndpoint[];
};

const TAB_SMOKE_PATTERNS: Record<AssistantTab, string[]> = {
  graph: ['neograph', 'graph-fe-user-year', 'clinical_knowledge_graph', 'drugs-interaction'],
  assistant: ['drug_drug_interaction', 'comorbidity', 'medication_association', 'user_flags/'],
  asksam: ['ask_sam', '/gen-chat'],
  panel: [],
};

const DEFAULT_MANIFEST: AssistantApiManifest = {
  version: 1,
  discoveredAt: null,
  discoverySource: 'manual',
  baseUrl: process.env.STELLA_API_BASE_URL || process.env.NEOGRAPH_API_BASE_URL || '',
  endpoints: [],
};

function slugifyPath(pathname: string): string {
  return pathname
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .slice(0, 48);
}

function inferTab(call: TaggedCapturedApiCall): AssistantTab {
  if (call.tab) return call.tab;
  const pathLower = call.path.toLowerCase();
  const hostLower = call.host.toLowerCase();
  if (TAB_SMOKE_PATTERNS.graph.some((h) => pathLower.includes(h) || hostLower.includes(h))) return 'graph';
  if (TAB_SMOKE_PATTERNS.asksam.some((h) => pathLower.includes(h))) return 'asksam';
  if (TAB_SMOKE_PATTERNS.assistant.some((h) => pathLower.includes(h) || hostLower.includes(h))) return 'assistant';
  return 'panel';
}

function shouldSmokeEndpoint(call: TaggedCapturedApiCall, tab: AssistantTab): boolean {
  if (call.responseStatus && call.responseStatus >= 400) return false;
  if (/analytics\.google|googletagmanager|clerk|stripe/i.test(call.host)) return false;
  const pathLower = call.path.split('?')[0].toLowerCase();
  const hostLower = call.host.toLowerCase();
  return TAB_SMOKE_PATTERNS[tab].some((hint) => pathLower.includes(hint) || hostLower.includes(hint));
}

function endpointNameFromCall(call: TaggedCapturedApiCall, tab: AssistantTab): string {
  const parts = call.path.split('/').filter(Boolean);
  const short = parts.slice(-2).join(' / ') || call.path;
  const tabLabel = tab.charAt(0).toUpperCase() + tab.slice(1);
  return `${tabLabel} — ${short}`;
}

function isDsHost(host: string): boolean {
  return /uwc\.world|neograph|stella|agentic|unitedwecare/i.test(host);
}

export function loadAssistantManifest(): AssistantApiManifest {
  if (!fs.existsSync(MANIFEST_PATH)) return { ...DEFAULT_MANIFEST };
  try {
    const raw = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as AssistantApiManifest;
    return {
      ...DEFAULT_MANIFEST,
      ...raw,
      endpoints: Array.isArray(raw.endpoints) ? raw.endpoints : [],
    };
  } catch {
    return { ...DEFAULT_MANIFEST };
  }
}

export function saveAssistantManifest(manifest: AssistantApiManifest) {
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

export function buildAssistantManifestFromCapture(calls: TaggedCapturedApiCall[]): AssistantApiManifest {
  const successful = calls.filter((call) => (call.responseStatus || 0) < 400);
  const candidates = successful.length > 0 ? successful : calls;

  const hostCounts = new Map<string, number>();
  for (const call of candidates) {
    if (!isDsHost(call.host)) continue;
    hostCounts.set(call.host, (hostCounts.get(call.host) || 0) + 1);
  }

  let baseUrl = process.env.STELLA_API_BASE_URL || process.env.NEOGRAPH_API_BASE_URL || '';
  if (hostCounts.size > 0) {
    const topHost = [...hostCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    baseUrl = `https://${topHost}`;
  }

  const endpoints: AssistantEndpoint[] = [];
  const seen = new Set<string>();
  const smokeIndexByTab: Record<AssistantTab, number> = {
    graph: 1,
    assistant: 1,
    asksam: 1,
    panel: 1,
  };

  const tabOrder: AssistantTab[] = ['graph', 'assistant', 'asksam', 'panel'];

  const ordered = [...candidates].sort((a, b) => {
    const tabA = tabOrder.indexOf(inferTab(a));
    const tabB = tabOrder.indexOf(inferTab(b));
    return tabA - tabB || a.path.localeCompare(b.path);
  });

  for (const call of ordered) {
    const key = `${call.method} ${call.host} ${call.path}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const tab = inferTab(call);
    const smoke = shouldSmokeEndpoint(call, tab);
    const id = smoke
      ? `TC_AST_${({ graph: 'GR', assistant: 'AS', asksam: 'AK', panel: 'PN' } as const)[tab]}_${String(smokeIndexByTab[tab]++).padStart(2, '0')}`
      : `CAPTURED_${slugifyPath(call.path)}`;

    const endpoint: AssistantEndpoint = {
      id,
      name: endpointNameFromCall(call, tab),
      method: call.method,
      path: call.path,
      fullUrl: call.fullUrl,
      host: call.host,
      tab,
      smoke,
      expectedStatus: call.responseStatus && call.responseStatus < 400 ? call.responseStatus : 200,
      requestHeaders: call.requestHeaders,
      discoveredFrom: 'prod-copilot-assistant-panel',
    };

    if (call.requestBody !== undefined) {
      endpoint.samplePayload = call.requestBody;
    }

    if (call.method === 'GET' && /\/health\b/i.test(call.path) && call.responseBody && typeof call.responseBody === 'object') {
      endpoint.bodyMatch = call.responseBody as Record<string, unknown>;
    }

    if (endpoint.path.includes('/gen-chat') && call.responseBody) {
      endpoint.bodyContains = ['user_id'];
    }

    endpoints.push(endpoint);
  }

  return {
    version: 1,
    discoveredAt: new Date().toISOString(),
    discoverySource: 'prod-copilot-assistant-panel',
    baseUrl,
    endpoints,
  };
}

export function assistantUrl(manifest: AssistantApiManifest, endpoint: AssistantEndpoint): string {
  if (endpoint.fullUrl) return endpoint.fullUrl;
  const base = (manifest.baseUrl || '').replace(/\/$/, '');
  if (!base) throw new Error('Assistant baseUrl missing — run discover:assistant-apis first');
  return `${base}${endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`}`;
}

export function getAssistantSmokeEndpoints(manifest: AssistantApiManifest): AssistantEndpoint[] {
  return manifest.endpoints.filter((endpoint) => endpoint.smoke);
}

export function formatAssistantApiProof(opts: {
  endpoint: AssistantEndpoint;
  status: number;
  body: unknown;
}): Record<string, unknown> {
  const pathOrUrl = opts.endpoint.fullUrl || opts.endpoint.path;
  const proof = formatApiProof({
    endpoint: pathOrUrl,
    method: opts.endpoint.method,
    status: opts.status,
    body: opts.body,
  });
  return { ...proof, tab: opts.endpoint.tab };
}

export { resolveEndpointHeaders, formatApiProof };
