// Socket contract shared by apps/api (server), apps/web, and apps/mobile
// (clients). Matches MIGRATION-AUDIT.md §5 SOCKET CONTRACT exactly,
// including `resultsReady`, which is documented but never emitted by the
// current server implementation — see the note on its payload below.

import { z } from 'zod';
import { resultSchema } from './schemas';

// ── Client → Server payloads ─────────────────────────────────────────────

export const joinRoomPayloadSchema = z.object({
  sessionId: z.string(),
  playerId: z.string(),
});
export type JoinRoomPayload = z.infer<typeof joinRoomPayloadSchema>;

export const submitAnswerSocketPayloadSchema = z.object({
  sessionId: z.string(),
  playerId: z.string(),
  questionId: z.number().int(),
  answerIndex: z.number().int(),
});
export type SubmitAnswerSocketPayload = z.infer<
  typeof submitAnswerSocketPayloadSchema
>;

export const quizCompletePayloadSchema = z.object({
  sessionId: z.string(),
  playerId: z.string(),
});
export type QuizCompletePayload = z.infer<typeof quizCompletePayloadSchema>;

// ── Server → Client payloads ─────────────────────────────────────────────

export const playerJoinedPayloadSchema = z.object({
  playerId: z.string(),
});
export type PlayerJoinedPayload = z.infer<typeof playerJoinedPayloadSchema>;

export const answerSubmittedPayloadSchema = z.object({
  playerId: z.string(),
  questionId: z.number().int(),
  answerIndex: z.number().int(),
});
export type AnswerSubmittedPayload = z.infer<
  typeof answerSubmittedPayloadSchema
>;

export const playerCompletePayloadSchema = z.object({
  playerId: z.string(),
});
export type PlayerCompletePayload = z.infer<typeof playerCompletePayloadSchema>;

/**
 * Documented in architecture_documentation.md as carrying the `QuizResult`
 * payload, but `QuizGateway.emitResultsReady` is never called anywhere in
 * apps/api and no client subscribes to it (MIGRATION-AUDIT.md §6 DRIFT #1).
 * Typed here to match the documented shape; it is currently dead code on
 * both ends, not a live event.
 */
export const resultsReadyPayloadSchema = resultSchema;
export type ResultsReadyPayload = z.infer<typeof resultsReadyPayloadSchema>;

// ── socket.io generics ───────────────────────────────────────────────────

export interface ServerToClientEvents {
  playerJoined: (payload: PlayerJoinedPayload) => void;
  answerSubmitted: (payload: AnswerSubmittedPayload) => void;
  playerComplete: (payload: PlayerCompletePayload) => void;
  resultsReady: (payload: ResultsReadyPayload) => void;
}

export interface ClientToServerEvents {
  joinRoom: (payload: JoinRoomPayload) => void;
  submitAnswer: (payload: SubmitAnswerSocketPayload) => void;
  quizComplete: (payload: QuizCompletePayload) => void;
}
