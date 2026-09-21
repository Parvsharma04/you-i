import {
  View,
  type AccessibilityProps,
  type GestureResponderEvent,
} from 'react-native';

import { cx } from '@/lib/cx';
import { MotionPressable } from '@/theme';

import { Text } from './text';

export type ButtonProps = AccessibilityProps & {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  className?: string;
  fullWidth?: boolean;
};

/**
 * Native port of web's `.btn-primary` (globals.css). Hover isn't a thing on
 * a touchscreen, so the hover/active/disabled trio collapses to
 * pressed/disabled: pressing slides the button the full shadow offset
 * (mirrors `shadow-retro` → `shadow-none` on `:active`), disabled swaps in
 * the web's `#ffb6c1` disabled fill and drops the press animation.
 * Minimum 44x44pt touch target via `min-h-11 min-w-11` (Tailwind's spacing
 * scale: 11 * 4px = 44px).
 */
export function Button({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  className,
  fullWidth = false,
  accessibilityLabel,
  ...accessibilityProps
}: ButtonProps) {
  return (
    <View className={cx('relative', fullWidth ? 'w-full' : 'self-start')}>
      <View
        pointerEvents="none"
        className="absolute inset-0 translate-x-1 translate-y-1 bg-border-color"
      />
      <MotionPressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={accessibilityLabel ?? title}
        disabled={disabled}
        onPress={onPress}
        className={cx(
          'min-h-11 min-w-11 flex-row items-center justify-center border-3 border-border-color px-6 py-3',
          disabled
            ? 'bg-[#ffb6c1]'
            : variant === 'secondary'
              ? 'bg-bg-secondary'
              : 'bg-accent',
          fullWidth && 'w-full',
          className,
        )}
        {...accessibilityProps}
      >
        <Text
          variant="display-lg"
          color={variant === 'secondary' ? 'primary' : 'white'}
          className="uppercase tracking-[2px]"
        >
          {title}
        </Text>
      </MotionPressable>
    </View>
  );
}
