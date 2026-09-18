/**
 * Minimal className joiner — avoids adding `clsx`/`cva` as a new dependency
 * for what components/ui only needs (a handful of conditional strings).
 */
export function cx(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(' ');
}
