import {
  createSessionResponseSchema,
  joinSessionResponseSchema,
  sessionSchema,
  questionsResponseSchema,
  answerCountResponseSchema,
  resultStatusResponseSchema,
  type CreateSessionResponse,
  type JoinSessionResponse,
  type SessionResponse,
  type Question,
  type AnswerCountResponse,
  type ResultStatusResponse,
} from '@youandi/shared';
import { type ZodSchema } from 'zod';
import { DEVICE_ID_HEADER } from '@youandi/shared';
import { getDeviceId } from './device-id';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

async function fetchAPI<T>(
  endpoint: string,
  schema: ZodSchema<T>,
  options?: RequestInit,
): Promise<T> {
  const deviceId = getDeviceId();
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(deviceId ? { [DEVICE_ID_HEADER]: deviceId } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
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

export type { CreateSessionResponse, JoinSessionResponse, SessionResponse, Question, AnswerCountResponse };

// ─── DRIFT NOTE ──────────────────────────────────────────────────────────────
// The API wraps result responses in { status, data } (ResultStatusResponse),
// but the results page currently expects the raw Result object. The web
// client has never handled the 'pending' status. This mismatch is left as-is
// pending a decision — see the prompt that produced this refactor. The api
// methods below expose the full ResultStatusResponse envelope so callers can
// be updated when that decision is made.
// ─────────────────────────────────────────────────────────────────────────────

export const api = {
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

  getQuestions: (sessionId: string) =>
    fetchAPI(`/question/${sessionId}`, questionsResponseSchema),

  submitAnswer: (
    sessionId: string,
    questionId: number,
    playerId: string,
    answer: string,
  ) =>
    fetch(`${API_URL}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Player-Id': playerId,
        [DEVICE_ID_HEADER]: getDeviceId(),
      },
      // playerId is also still sent in the body as a deprecated fallback —
      // remove once the API's ALLOW_LEGACY_PLAYER_ID_BODY flag is off.
      body: JSON.stringify({ sessionId, questionId, playerId, answer }),
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || 'Request failed');
      }
    }),

  getAnswerCount: (sessionId: string) =>
    fetchAPI(`/answer/${sessionId}/count`, answerCountResponseSchema),

  generateResult: (sessionId: string, playerId: string): Promise<ResultStatusResponse> =>
    fetchAPI(`/result/generate/${sessionId}`, resultStatusResponseSchema, {
      method: 'POST',
      headers: { 'X-Player-Id': playerId },
    }),

  getResult: (sessionId: string, playerId: string): Promise<ResultStatusResponse> =>
    fetchAPI(`/result/${sessionId}`, resultStatusResponseSchema, {
      headers: { 'X-Player-Id': playerId },
    }),
};
