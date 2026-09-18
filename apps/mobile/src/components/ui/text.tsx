import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { cx } from '@/lib/cx';

export type TextVariant =
  'display-xl' | 'display-lg' | 'display-md' | 'body' | 'body-sm' | 'body-xs';
export type TextColor = 'primary' | 'secondary' | 'muted' | 'accent' | 'white';

const VARIANT_CLASSES: Record<TextVariant, string> = {
  // h1/h2/h3 in globals.css `@layer base` (font-display = VT323).
  'display-xl': 'font-display text-display-xl',
  'display-lg': 'font-display text-display-lg',
  'display-md': 'font-display text-display-md',
  // Body copy (font-body = Space Mono 400).
  body: 'font-body text-base',
  'body-sm': 'font-body text-sm',
  'body-xs': 'font-body text-xs',
};

const COLOR_CLASSES: Record<TextColor, string> = {
  primary: 'text-text-primary',
  secondary: 'text-text-secondary',
  muted: 'text-text-muted',
  accent: 'text-accent',
  white: 'text-white',
};

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: TextColor;
  /** Swaps in Space Mono 700 for body variants; display type has one weight (VT323). */
  bold?: boolean;
};

/**
 * Typographic-scale wrapper around RN's `Text` — screens should always
 * import this, never `Text` from `react-native` directly, so every string
 * in the app resolves to one of the six tokens above instead of ad-hoc
 * font sizes.
 */
export function Text({
  variant = 'body',
  color = 'primary',
  bold = false,
  className,
  style,
  ...props
}: TextProps) {
  const isDisplay = variant.startsWith('display');
  return (
    <RNText
      className={cx(
        VARIANT_CLASSES[variant],
        COLOR_CLASSES[color],
        bold && !isDisplay && 'font-body-bold',
        className,
      )}
      style={style}
      {...props}
    />
  );
}
