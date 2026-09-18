/**
 * Masks a bearer player id for display. Full ids never leave secure storage.
 */
export function maskPlayerId(id: string): string {
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}
