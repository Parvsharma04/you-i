/**
 * Normalises a room code entered by a user or produced by the generator.
 *
 * Rules (applied in order):
 * 1. Upper-case.
 * 2. Strip whitespace and dashes.
 * 3. Map visually similar letters to digits:
 *    - O → 0
 *    - I, L → 1
 *
 * The generator already emits Crockford base32, but normalising its output
 * guarantees the same path is exercised in tests and avoids any accidental
 * drift between generation and validation.
 */
export function normalizeRoomCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
}
