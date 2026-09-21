import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { FONT_FAMILY } from '@/lib/fonts';
import { useTheme } from '@/theme';

export type TextVariant =
  | 'display-xl'
  | 'display'
  | 'title'
  | 'body'
  | 'label'
  | 'mono'
  | 'display-lg'
  | 'display-md'
  | 'body-sm'
  | 'body-xs';
export type TextColor = 'primary' | 'secondary' | 'muted' | 'accent' | 'white';

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: TextColor;
  bold?: boolean;
};

const sizes: Record<TextVariant, { fontSize: number; lineHeight: number }> = {
  'display-xl': { fontSize: 52, lineHeight: 58 },
  display: { fontSize: 34, lineHeight: 40 },
  title: { fontSize: 24, lineHeight: 30 },
  body: { fontSize: 16, lineHeight: 22 },
  label: { fontSize: 14, lineHeight: 20 },
  mono: { fontSize: 14, lineHeight: 20 },
  'display-lg': { fontSize: 34, lineHeight: 40 },
  'display-md': { fontSize: 24, lineHeight: 30 },
  'body-sm': { fontSize: 14, lineHeight: 20 },
  'body-xs': { fontSize: 12.5, lineHeight: 17 },
};

export function Text({
  variant = 'body',
  color = 'primary',
  bold = false,
  style,
  ...props
}: TextProps) {
  const theme = useTheme();
  const display = variant.startsWith('display') || variant === 'title';
  const colorValue =
    color === 'primary'
      ? theme.ink
      : color === 'secondary'
        ? theme.ink2
        : color === 'muted'
          ? theme.ink3
          : color === 'accent'
            ? theme.accent
            : theme.card;
  const family = display
    ? bold
      ? FONT_FAMILY.display700
      : FONT_FAMILY.display
    : variant === 'mono'
      ? 'monospace'
      : bold
        ? FONT_FAMILY.body700
        : FONT_FAMILY.body;

  return (
    <RNText
      {...props}
      style={[
        sizes[variant],
        {
          color: colorValue,
          fontFamily: family,
          letterSpacing: display ? -0.035 * sizes[variant].fontSize : undefined,
        },
        style,
      ]}
    />
  );
}
