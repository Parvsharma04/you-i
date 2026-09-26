/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useTheme as useResolvedTheme } from '@/theme';

export function useTheme() {
  const theme = useResolvedTheme();

  return {
    text: theme.ink,
    background: theme.surface,
    backgroundElement: theme.card,
    backgroundSelected: theme.line,
    textSecondary: theme.ink2,
  };
}
