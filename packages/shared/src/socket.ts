// Socket contract shared by apps/api (server), apps/web, and apps/mobile
// (clients). Matches MIGRATION-AUDIT.md §5 SOCKET CONTRACT exactly.

import { z } from 'zod';

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

// ── socket.io generics ───────────────────────────────────────────────────

export interface ServerToClientEvents {
  playerJoined: (payload: PlayerJoinedPayload) => void;
  answerSubmitted: (payload: AnswerSubmittedPayload) => void;
  playerComplete: (payload: PlayerCompletePayload) => void;
}

export interface ClientToServerEvents {
  joinRoom: (payload: JoinRoomPayload) => void;
  submitAnswer: (payload: SubmitAnswerSocketPayload) => void;
  quizComplete: (payload: QuizCompletePayload) => void;
}
