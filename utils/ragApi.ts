import * as dotenv from 'dotenv';

dotenv.config();

export const RAG_API = {
  baseUrl: (process.env.RAG_API_BASE_URL || 'https://rag.uwc.world').replace(/\/$/, ''),
  userId: process.env.RAG_API_USER_ID || 'automation-smoke',
  sessionId: process.env.RAG_API_SESSION_ID || 'smoke-session',
  registeredId: process.env.RAG_API_REGISTERED_ID || 'automation-smoke',
  genChatMessage: process.env.RAG_API_GEN_CHAT_MESSAGE || 'ping',
  genChatClassify: process.env.RAG_API_GEN_CHAT_CLASSIFY || 'general',
};

export function ragUrl(path: string): string {
  return `${RAG_API.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildGenChatPayload() {
  return {
    user_id: RAG_API.userId,
    response: RAG_API.genChatMessage,
    classify: RAG_API.genChatClassify,
    time_stamp: new Date().toISOString(),
    headers: {
      user_id: RAG_API.userId,
      session_id: RAG_API.sessionId,
      registered_id: RAG_API.registeredId,
    },
  };
}

/** Extract LLM text from gen-chat response body. */
export function extractGenChatContent(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const record = body as Record<string, unknown>;
  const response = record.response;
  if (typeof response === 'string') return response.trim();
  if (response && typeof response === 'object') {
    const content = (response as Record<string, unknown>).content;
    if (typeof content === 'string') return content.trim();
  }
  return '';
}
