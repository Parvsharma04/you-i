import {
  createSessionResponseSchema,
  joinSessionResponseSchema,
  sessionSchema,
  questionsResponseSchema,
  answerSchema,
  answerCountResponseSchema,
  resultStatusResponseSchema,
  sessionStateResponseSchema,
  mySessionsResponseSchema,
  PLAYER_ID_HEADER,
  DEVICE_ID_HEADER,
  type CreateSessionResponse,
  type JoinSessionResponse,
  type SessionResponse,
  type SessionStateResponse,
  type MySessionsResponse,
  type Question,
  type Answer,
  type AnswerCountResponse,
  type ResultStatusResponse,
} from '@youandi/shared';
import { type ZodSchema } from 'zod';
import { getDeviceId } from './device-id';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

const SESSION_STORAGE_PREFIX = 'player_';

// ─── Player identity helpers ──────────────────────────────────────────────────
// The single type for what we keep in sessionStorage per session.
// deviceId is stored here so we can re-attach it when reading back the record.

export interface StoredPlayerInfo {
  playerId: string;
  isHost: boolean;
  deviceId: string;
}

export function savePlayerInfo(sessionId: string, info: StoredPlayerInfo): void {
  sessionStorage.setItem(
    `${SESSION_STORAGE_PREFIX}${sessionId}`,
    JSON.stringify(info),
  );
}

export function loadPlayerInfo(sessionId: string): StoredPlayerInfo | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(`${SESSION_STORAGE_PREFIX}${sessionId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredPlayerInfo;
  } catch {
    return null;
  }
}

// ─── Internal fetch wrapper ───────────────────────────────────────────────────
// Attaches X-Device-Id automatically. Pass `playerId` to also send X-Player-Id.
// Call sites must not set either identity header manually.

async function fetchAPI<T>(
  endpoint: string,
  schema: ZodSchema<T>,
  options?: RequestInit & { playerId?: string },
): Promise<T> {
  const deviceId = getDeviceId();
  const { playerId, ...restOptions } = options ?? {};

  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(deviceId ? { [DEVICE_ID_HEADER]: deviceId } : {}),
      ...(playerId ? { [PLAYER_ID_HEADER]: playerId } : {}),
      ...restOptions.headers,
    },
    ...restOptions,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    const err = new Error(error.message || 'Request failed') as Error & { code?: string };
    if (typeof error.code === 'string') err.code = error.code;
    throw err;
  }

  const text = await res.text();
  const raw = text ? JSON.parse(text) : null;

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Response validation failed: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
    );
  }

  return parsed.data;
}

export type {
  CreateSessionResponse,
  JoinSessionResponse,
  SessionResponse,
  SessionStateResponse,
  MySessionsResponse,
  Question,
  Answer,
  AnswerCountResponse,
};

// ─── DRIFT NOTE ──────────────────────────────────────────────────────────────
// The API wraps result responses in { status, data } (ResultStatusResponse),
// but the results page currently expects the raw Result object. The web
// client has never handled the 'pending' status. This mismatch is left as-is
// pending a decision — see the prompt that produced this refactor. The api
// methods below expose the full ResultStatusResponse envelope so callers can
// be updated when that decision is made.
// ─────────────────────────────────────────────────────────────────────────────

export const api = {
  // No player id needed — the server assigns one on create/join.
  createSession: (category: string, questionCount: number) =>
    fetchAPI('/session/create', createSessionResponseSchema, {
      method: 'POST',
      body: JSON.stringify({ category, questionCount }),
    }),

  joinSession: (code: string) =>
    fetchAPI('/session/join', joinSessionResponseSchema, {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  getSession: (sessionId: string) =>
    fetchAPI(`/session/${sessionId}`, sessionSchema),

  getSessionState: (sessionId: string) => {
    const info = loadPlayerInfo(sessionId);
    return fetchAPI(`/session/${sessionId}/state`, sessionStateResponseSchema, {
      playerId: info?.playerId,
    });
  },

  getMySessions: (): Promise<MySessionsResponse> =>
    fetchAPI('/sessions/mine', mySessionsResponseSchema),

  getQuestions: (sessionId: string) =>
    fetchAPI(`/question/${sessionId}`, questionsResponseSchema),

  // playerId is read from sessionStorage — call sites no longer pass it.
  submitAnswer: (sessionId: string, questionId: number, answer: string): Promise<Answer> => {
    const info = loadPlayerInfo(sessionId);
    return fetchAPI('/answer', answerSchema, {
      method: 'POST',
      playerId: info?.playerId,
      body: JSON.stringify({ sessionId, questionId, answer }),
    });
  },

  getAnswerCount: (sessionId: string) =>
    fetchAPI(`/answer/${sessionId}/count`, answerCountResponseSchema),

  generateResult: (sessionId: string): Promise<ResultStatusResponse> => {
    const info = loadPlayerInfo(sessionId);
    return fetchAPI(`/result/generate/${sessionId}`, resultStatusResponseSchema, {
      method: 'POST',
      playerId: info?.playerId,
    });
  },

  getResult: (sessionId: string): Promise<ResultStatusResponse> => {
    const info = loadPlayerInfo(sessionId);
    return fetchAPI(`/result/${sessionId}`, resultStatusResponseSchema, {
      playerId: info?.playerId,
    });
  },
};
