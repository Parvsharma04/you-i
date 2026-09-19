import { z } from 'zod';

import { env } from './env';
import { getOrCreateDeviceId } from './storage';
import {
  PLAYER_ID_HEADER,
  DEVICE_ID_HEADER,
  createSessionRequestSchema,
  createSessionResponseSchema,
  joinSessionRequestSchema,
  joinSessionResponseSchema,
  sessionSchema,
  sessionStateResponseSchema,
  questionsResponseSchema,
  submitAnswerRequestSchema,
  answerSchema,
  answersResponseSchema,
  answerCountResponseSchema,
  generateResultResponseSchema,
  getResultResponseSchema,
  type CreateSessionRequest,
  type CreateSessionResponse,
  type JoinSessionRequest,
  type JoinSessionResponse,
  type SessionResponse,
  type SessionStateResponse,
  type QuestionsResponse,
  type SubmitAnswerRequest,
  type Answer,
  type AnswersResponse,
  type AnswerCountResponse,
  type GenerateResultResponse,
  type GetResultResponse,
} from '@youandi/shared';

const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 300;

export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super(cause instanceof Error ? cause.message : 'Network request failed');
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor() {
    super('Request timed out');
    this.name = 'TimeoutError';
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions<TResponse> {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  playerId?: string;
  deviceId?: string;
  schema: z.ZodSchema<TResponse>;
  timeoutMs?: number;
}

function isRetryable(error: unknown, status: number | null): boolean {
  if (status !== null && status >= 500 && status < 600) return true;
  return error instanceof TypeError || error instanceof NetworkError;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new TimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function request<TResponse>({
  method,
  path,
  body,
  playerId,
  deviceId,
  schema,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: RequestOptions<TResponse>): Promise<TResponse> {
  const url = `${env.apiUrl}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (playerId) {
    headers[PLAYER_ID_HEADER] = playerId;
  }
  if (deviceId) {
    headers[DEVICE_ID_HEADER] = deviceId;
  }

  const init: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  const shouldRetry = method !== 'POST' || !path.startsWith('/result/generate');

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, init, timeoutMs);

      if (!response.ok) {
        const text = await response.text();
        let parsed: { code?: string; message?: string } | null = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          // Leave parsed as null; fall back to status-based message.
        }

        const error = new ApiError(
          response.status,
          parsed?.code ?? `http_${response.status}`,
          parsed?.message ?? (text || `HTTP ${response.status}`),
        );

        if (!shouldRetry || !isRetryable(error, response.status)) {
          throw error;
        }
        lastError = error;
      } else {
        const json = await response.json();
        const parsed = schema.safeParse(json);
        if (!parsed.success) {
          throw new ApiError(
            response.status,
            'schema_validation_failed',
            `Response did not match expected schema: ${parsed.error.message}`,
          );
        }
        return parsed.data;
      }
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw error;
      }

      const retryable = isRetryable(error, null);
      if (!shouldRetry || !retryable) {
        throw error instanceof NetworkError ? error : new NetworkError(error);
      }
      lastError = error;
    }

    if (attempt < MAX_RETRIES - 1) {
      await sleep(INITIAL_BACKOFF_MS * 2 ** attempt);
    }
  }

  throw lastError instanceof NetworkError
    ? lastError
    : new NetworkError(lastError);
}

export async function createSession(
  body: CreateSessionRequest,
): Promise<CreateSessionResponse> {
  createSessionRequestSchema.parse(body);
  const deviceId = await getOrCreateDeviceId();
  return request({
    method: 'POST',
    path: '/session/create',
    body,
    deviceId,
    schema: createSessionResponseSchema,
  });
}

export async function joinSessionByCode(
  code: string,
): Promise<JoinSessionResponse> {
  const body: JoinSessionRequest = { code };
  joinSessionRequestSchema.parse(body);
  const deviceId = await getOrCreateDeviceId();
  return request({
    method: 'POST',
    path: '/session/join',
    body,
    deviceId,
    schema: joinSessionResponseSchema,
  });
}

export async function getSession(sessionId: string): Promise<SessionResponse> {
  return request({
    method: 'GET',
    path: `/session/${encodeURIComponent(sessionId)}`,
    schema: sessionSchema,
  });
}

export async function getSessionState(
  sessionId: string,
  playerId: string,
): Promise<SessionStateResponse> {
  return request({
    method: 'GET',
    path: `/session/${encodeURIComponent(sessionId)}/state`,
    playerId,
    schema: sessionStateResponseSchema,
  });
}

export async function getQuestions(
  sessionId: string,
): Promise<QuestionsResponse> {
  return request({
    method: 'GET',
    path: `/question/${encodeURIComponent(sessionId)}`,
    schema: questionsResponseSchema,
  });
}

export async function submitAnswer(
  body: SubmitAnswerRequest,
  playerId: string,
): Promise<Answer> {
  submitAnswerRequestSchema.parse(body);
  return request({
    method: 'POST',
    path: '/answer',
    body,
    playerId,
    schema: answerSchema,
  });
}

export async function getAnswers(sessionId: string): Promise<AnswersResponse> {
  return request({
    method: 'GET',
    path: `/answer/${encodeURIComponent(sessionId)}`,
    schema: answersResponseSchema,
  });
}

export async function getAnswerCount(
  sessionId: string,
): Promise<AnswerCountResponse> {
  return request({
    method: 'GET',
    path: `/answer/${encodeURIComponent(sessionId)}/count`,
    schema: answerCountResponseSchema,
  });
}

export async function generateResult(
  sessionId: string,
  playerId: string,
): Promise<GenerateResultResponse> {
  return request({
    method: 'POST',
    path: `/result/generate/${encodeURIComponent(sessionId)}`,
    playerId,
    schema: generateResultResponseSchema,
  });
}

export async function getResult(
  sessionId: string,
  playerId: string,
): Promise<GetResultResponse> {
  return request({
    method: 'GET',
    path: `/result/${encodeURIComponent(sessionId)}`,
    playerId,
    schema: getResultResponseSchema,
  });
}
