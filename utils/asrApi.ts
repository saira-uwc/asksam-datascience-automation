import * as dotenv from 'dotenv';
import { spawnSync } from 'child_process';

dotenv.config();

export const ASR_API = {
  baseUrl: (process.env.ASR_API_BASE_URL || 'https://cauth.unitedwecare.com').replace(/\/$/, ''),
  apiKey: process.env.ASR_API_KEY || '',
  audioUrl:
    process.env.ASR_AUDIO_URL ||
    'https://firebasestorage.googleapis.com/v0/b/united-for-her.appspot.com/o/uploads%2Frecording_1782127426430_644938.webm?alt=media&token=fce69d88-e7ee-45a5-b079-f69183582299',
  language: process.env.ASR_LANGUAGE || 'en',
};

export function asrUrl(path: string): string {
  return `${ASR_API.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildTranscribeFromUrlPayload() {
  return {
    url: ASR_API.audioUrl,
    language: ASR_API.language,
  };
}

export function extractTranscriptionText(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const record = body as Record<string, unknown>;
  const data = record.data;
  if (data && typeof data === 'object') {
    const text = (data as Record<string, unknown>).text;
    if (typeof text === 'string') return text.trim();
  }
  return '';
}

export function asrRequestHeaders(): Record<string, string> {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${ASR_API.apiKey}`,
    'user-agent':
      process.env.ASR_USER_AGENT ||
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  };
}

function asrCurlAuthHeader(): string {
  return `Authorization: Bearer ${ASR_API.apiKey}`;
}

/** POST transcribe-from-url-v2 via curl (matches tech-team recipe; avoids Cloudflare blocking Playwright TLS). */
export function postAsrTranscribe(): { status: number; bodyText: string } {
  const url = asrUrl('/transcriptions/transcribe-from-url-v2');
  const payload = JSON.stringify(buildTranscribeFromUrlPayload());
  const result = spawnSync(
    'curl',
    [
      '-s',
      '-S',
      '-w',
      '\n__HTTP_STATUS__:%{http_code}',
      url,
      '-H',
      'content-type: application/json',
      '-H',
      asrCurlAuthHeader(),
      '--data-raw',
      payload,
    ],
    { encoding: 'utf8', timeout: 180000, maxBuffer: 10 * 1024 * 1024 },
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `curl exited with code ${result.status}`);
  }

  const output = result.stdout || '';
  const match = output.match(/__HTTP_STATUS__:(\d+)$/);
  const status = match ? Number.parseInt(match[1], 10) : 0;
  const bodyText = output.replace(/\n__HTTP_STATUS__:\d+$/, '');
  return { status, bodyText };
}

export function parseAsrResponseBody(bodyText: string): unknown {
  if (!bodyText) return '';
  try {
    return JSON.parse(bodyText);
  } catch {
    return bodyText;
  }
}
