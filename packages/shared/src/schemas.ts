// Single source of truth for every request/response body in the API.
// Types are derived with `z.infer` — never hand-write a parallel interface.

import { z } from 'zod';
import { CATEGORIES, QUESTION_TYPES, SESSION_STATUSES } from './constants';

export const categorySchema = z.enum(CATEGORIES);

export const questionTypeSchema = z.enum([
  QUESTION_TYPES.MCQ,
  QUESTION_TYPES.TEXT,
]);

export const sessionStatusSchema = z.enum([
  SESSION_STATUSES.WAITING,
  SESSION_STATUSES.ACTIVE,
  SESSION_STATUSES.COMPLETED,
  SESSION_STATUSES.EXPIRED,
  SESSION_STATUSES.ABANDONED,
]);

export const playerRoleSchema = z.enum(['player1', 'player2']);
export type PlayerRole = z.infer<typeof playerRoleSchema>;

// ── POST /session/create ────────────────────────────────────────────────

export const createSessionRequestSchema = z.object({
  category: categorySchema,
  questionCount: z.number().int().min(5).max(20),
});
export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;

export const createSessionResponseSchema = z.object({
  sessionId: z.string(),
  playerId: z.string(),
  code: z.string(),
  questionIds: z.array(z.number().int()),
});
export type CreateSessionResponse = z.infer<
  typeof createSessionResponseSchema
>;

// ── POST /session/join ──────────────────────────────────────────────────

export const JOIN_SESSION_ERROR_CODES = [
  'CODE_NOT_FOUND',
  'CODE_EXPIRED',
  'SESSION_FULL',
  'SESSION_FINISHED',
  'ALREADY_JOINED',
  'SELF_JOIN',
  'RATE_LIMITED',
] as const;

export const joinSessionErrorCodeSchema = z.enum(JOIN_SESSION_ERROR_CODES);
export type JoinSessionErrorCode = z.infer<typeof joinSessionErrorCodeSchema>;

export const joinSessionRequestSchema = z
  .object({
    code: z.string().min(1).optional(),
    sessionId: z.string().min(1).optional(),
    passAndPlay: z.boolean().optional(),
  })
  .refine(
    (data) => data.code !== undefined || data.sessionId !== undefined,
    {
      message: 'Either code or sessionId is required',
      path: ['code'],
    },
  );
export type JoinSessionRequest = z.infer<typeof joinSessionRequestSchema>;

export const joinSessionResponseSchema = z.object({
  sessionId: z.string(),
  playerId: z.string(),
  role: playerRoleSchema,
  category: categorySchema,
  questionCount: z.number().int(),
});
export type JoinSessionResponse = z.infer<typeof joinSessionResponseSchema>;

// ── GET /session/:id ─────────────────────────────────────────────────────

export const sessionSchema = z.object({
  id: z.string(),
  category: categorySchema,
  questionCount: z.number().int(),
  status: sessionStatusSchema,
  code: z.string().nullable(),
  codeExpiresAt: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type SessionResponse = z.infer<typeof sessionSchema>;

// ── POST /session/:id/regenerate-code ────────────────────────────────────

export const regenerateCodeResponseSchema = z.object({
  code: z.string(),
  expiresAt: z.string(),
});
export type RegenerateCodeResponse = z.infer<
  typeof regenerateCodeResponseSchema
>;

// ── GET /sessions/mine ───────────────────────────────────────────────────

export const mySessionSchema = z.object({
  id: z.string(),
  category: categorySchema,
  status: sessionStatusSchema,
  statusLabel: z.string(),
  questionCount: z.number().int(),
  role: playerRoleSchema,
  playerId: z.string(),
  partnerJoined: z.boolean(),
  yourAnswerCount: z.number().int(),
  partnerAnswerCount: z.number().int(),
  totalExpected: z.number().int(),
  passAndPlay: z.boolean(),
  lastActivityAt: z.string(),
  createdAt: z.string(),
});
export const mySessionsResponseSchema = z.array(mySessionSchema);
export type MySession = z.infer<typeof mySessionSchema>;
export type MySessionsResponse = z.infer<typeof mySessionsResponseSchema>;

// ── GET /question/:sessionId ─────────────────────────────────────────────

export const questionSchema = z.object({
  id: z.number().int(),
  text: z.string(),
  type: questionTypeSchema,
  options: z.array(z.string()).nullable(),
  category: categorySchema,
});
export type Question = z.infer<typeof questionSchema>;

export const questionsResponseSchema = z.array(questionSchema);
export type QuestionsResponse = z.infer<typeof questionsResponseSchema>;

// ── POST /answer ──────────────────────────────────────────────────────────
// `playerId` is optional here: the preferred path is the `X-Player-Id`
// header (see PlayerGuard in apps/api), validated against the session. The
// body field is only read as a deprecated fallback while apps/web migrates
// — see ALLOW_LEGACY_PLAYER_ID_BODY in apps/api.

export const submitAnswerRequestSchema = z.object({
  sessionId: z.string(),
  questionId: z.number().int(),
  playerId: z.string().optional(),
  answer: z.string(),
});
export type SubmitAnswerRequest = z.infer<typeof submitAnswerRequestSchema>;

export const answerSchema = z.object({
  id: z.number().int(),
  sessionId: z.string(),
  questionId: z.number().int(),
  playerId: z.string(),
  answer: z.string(),
});
export type Answer = z.infer<typeof answerSchema>;

// ── GET /answer/:sessionId ────────────────────────────────────────────────

export const answersResponseSchema = z.array(answerSchema);
export type AnswersResponse = z.infer<typeof answersResponseSchema>;

// ── GET /answer/:sessionId/count ─────────────────────────────────────────

export const answerCountResponseSchema = z.object({
  player1: z.number().int(),
  player2: z.number().int(),
  totalExpected: z.number().int(),
  bothComplete: z.boolean(),
});
export type AnswerCountResponse = z.infer<typeof answerCountResponseSchema>;

// ── POST /result/generate/:sessionId, GET /result/:sessionId ────────────

export const resultSchema = z.object({
  score: z.number(),
  summary: z.string(),
  strengths: z.array(z.string()),
  differences: z.array(z.string()),
});
export type Result = z.infer<typeof resultSchema>;

export const resultStatusSchema = z.enum(['none', 'pending', 'ready']);
export type ResultStatus = z.infer<typeof resultStatusSchema>;

// Shared shape for both endpoints: generation is async, so both the
// "kick off generation" and "poll for it" calls report the same tri-state.
export const resultStatusResponseSchema = z.object({
  status: resultStatusSchema,
  data: resultSchema.nullable(),
});
export type ResultStatusResponse = z.infer<typeof resultStatusResponseSchema>;

export const generateResultResponseSchema = resultStatusResponseSchema;
export type GenerateResultResponse = z.infer<
  typeof generateResultResponseSchema
>;

export const getResultResponseSchema = resultStatusResponseSchema;
export type GetResultResponse = z.infer<typeof getResultResponseSchema>;

// ── GET /session/:sessionId/state ────────────────────────────────────────
// Full rehydration payload for a client reconnecting/foregrounding: replaces
// separate session + questions + answers + result calls with one round trip.

export const sessionStateResponseSchema = z.object({
  session: z.object({
    id: z.string(),
    category: categorySchema,
    questionCount: z.number().int(),
    status: sessionStatusSchema,
    createdAt: z.string(),
  }),
  you: z.object({
    playerId: z.string(),
    role: playerRoleSchema,
    answeredQuestionIds: z.array(z.number().int()),
  }),
  partner: z.object({
    joined: z.boolean(),
    answeredQuestionIds: z.array(z.number().int()),
    complete: z.boolean(),
  }),
  questions: z.array(questionSchema.omit({ category: true })),
  result: z.object({
    status: resultStatusSchema,
    data: resultSchema.nullable(),
  }),
});
export type SessionStateResponse = z.infer<typeof sessionStateResponseSchema>;
