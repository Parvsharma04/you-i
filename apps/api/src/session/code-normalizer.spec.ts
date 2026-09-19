import { normalizeRoomCode } from './code-normalizer';

describe('normalizeRoomCode', () => {
  it('upper-cases lowercase input', () => {
    expect(normalizeRoomCode('abc123')).toBe('ABC123');
  });

  it('strips whitespace', () => {
    expect(normalizeRoomCode('A B C 1 2 3')).toBe('ABC123');
  });

  it('strips dashes', () => {
    expect(normalizeRoomCode('AB-CD-12')).toBe('ABCD12');
  });

  it('maps O to 0', () => {
    expect(normalizeRoomCode('ABCO12')).toBe('ABC012');
  });

  it('maps I and L to 1', () => {
    expect(normalizeRoomCode('IL1X')).toBe('111X');
  });

  it('applies all rules together', () => {
    expect(normalizeRoomCode('  a-b-o-i-l  ')).toBe('AB011');
  });
});
