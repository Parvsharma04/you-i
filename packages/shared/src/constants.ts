// Enums and thresholds shared by apps/api, apps/web, and apps/mobile.
// Kept as `as const` objects/arrays so both the runtime values and the
// derived TypeScript types come from a single declaration.

/**
 * Quiz categories. `fantasy` and `interests` are accepted by the API but
 * currently fall back to generic/`fun` content server-side (see
 * MIGRATION-AUDIT.md §6 DRIFT #3) — preserved here as-is, not fixed.
 */
export const CATEGORIES = [
  'love',
  'friendship',
  'deep_talk',
  'fun',
  'spicy',
  'fantasy',
  'interests',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const QUESTION_TYPES = {
  MCQ: 'mcq',
  TEXT: 'text',
} as const;

export type QuestionType =
  (typeof QUESTION_TYPES)[keyof typeof QUESTION_TYPES];

export const SESSION_STATUSES = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  ABANDONED: 'abandoned',
} as const;

export type SessionStatus =
  (typeof SESSION_STATUSES)[keyof typeof SESSION_STATUSES];

/**
 * Minimum compatibility score (inclusive) required for each rank, as used by
 * the results screen. Anything below the `C` threshold is `F`.
 */
export const SCORE_RANK_THRESHOLDS = {
  S: 90,
  A: 75,
  B: 60,
  C: 40,
} as const;

export type ScoreRank = keyof typeof SCORE_RANK_THRESHOLDS | 'F';

/**
 * Header carrying the caller's bearer player id, validated by `PlayerGuard`
 * in apps/api against the session's `SessionPlayer` rows. Required for
 * authenticated player routes.
 */
export const PLAYER_ID_HEADER = 'x-player-id';

/**
 * Header carrying the caller's stable device id. Used to identify the host
 * for lobby-management routes and to resume a session if a device re-joins
 * after force-quit. Stored only in `SessionPlayer.deviceId`.
 */
export const DEVICE_ID_HEADER = 'x-device-id';
