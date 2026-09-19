import { ApiError, NetworkError, TimeoutError } from '@/lib/api';

export type QuizError = {
  kind: 'notFound' | 'network' | 'unknown';
  message: string;
};

export function normalizeQuizError(err: unknown): QuizError {
  if (err instanceof NetworkError || err instanceof TimeoutError) {
    return {
      kind: 'network',
      message: "You're offline. Check your connection and try again.",
    };
  }

  if (err instanceof ApiError) {
    if (err.status === 404) {
      return {
        kind: 'notFound',
        message: 'Game not found. It may have expired.',
      };
    }
    return { kind: 'unknown', message: err.message };
  }

  return {
    kind: 'unknown',
    message: err instanceof Error ? err.message : 'Something went wrong.',
  };
}
