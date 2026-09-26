import type { JoinSessionErrorCode } from '@youandi/shared';

/**
 * Normalises a raw code input the same way the server does:
 * uppercase, strip whitespace and dashes, map O→0, I→1, L→1.
 */
export function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
}

const ERROR_MESSAGES: Record<JoinSessionErrorCode, string> = {
  CODE_NOT_FOUND: 'Room code not found. Check it and try again.',
  CODE_EXPIRED: 'That code has expired. Ask Player 1 for a new one.',
  SESSION_FULL: 'Game is already full.',
  SESSION_FINISHED: 'That game is already over.',
  SELF_JOIN: 'You created this session — wait for Player 2 to join.',
  RATE_LIMITED: 'Too many attempts. Take a breather and try again.',
  ALREADY_JOINED: null as unknown as string, // handled as success
};

export function joinErrorMessage(code: string): string {
  return (
    ERROR_MESSAGES[code as JoinSessionErrorCode] ??
    'Could not join. Try again.'
  );
}
