import type { TestInfo } from '@playwright/test';
import type { CapturedApiCall } from './apiCapture';

export type JourneySegment = {
  id: string;
  name: string;
  steps: string[];
  apis: JourneyApiEntry[];
  failedApis: JourneyApiEntry[];
  uiError?: string;
};

export type JourneyApiEntry = {
  method: string;
  host: string;
  path: string;
  fullUrl: string;
  status: number;
  body?: unknown;
  capturedAt: string;
};

export function sliceJourneyCalls(calls: CapturedApiCall[], fromIndex: number): JourneyApiEntry[] {
  return calls.slice(fromIndex).map(toJourneyApiEntry);
}

function toJourneyApiEntry(call: CapturedApiCall): JourneyApiEntry {
  return {
    method: call.method,
    host: call.host,
    path: call.path,
    fullUrl: call.fullUrl,
    status: call.responseStatus ?? 0,
    body: call.responseBody,
    capturedAt: call.capturedAt,
  };
}

export function buildJourneyReport(segments: JourneySegment[]) {
  const allFailed = segments.flatMap((segment) =>
    segment.failedApis.map((api) => ({
      journey: segment.name,
      ...api,
    })),
  );

  return {
    recordedAt: new Date().toISOString(),
    summary: {
      journeys: segments.length,
      totalApis: segments.reduce((sum, segment) => sum + segment.apis.length, 0),
      failedApiCalls: allFailed.length,
      journeysWithFailures: segments.filter((segment) => segment.failedApis.length > 0 || segment.uiError).length,
    },
    segments,
    failedApiCalls: allFailed,
  };
}

export async function attachJourneyReport(testInfo: TestInfo, report: ReturnType<typeof buildJourneyReport>) {
  const json = JSON.stringify(report, null, 2);
  await testInfo.attach('journey-api-record', {
    body: json,
    contentType: 'application/json',
  });
}

export function formatJourneyFailureSummary(report: ReturnType<typeof buildJourneyReport>): string {
  const lines: string[] = [];

  for (const segment of report.segments) {
    if (segment.uiError) {
      lines.push(`${segment.name}: UI error — ${segment.uiError}`);
    }
    for (const api of segment.failedApis) {
      lines.push(
        `${segment.name}: ${api.method} ${api.fullUrl} → ${api.status}${api.body ? ` (${String(api.body).slice(0, 120)})` : ''}`,
      );
    }
  }

  return lines.join('\n');
}
