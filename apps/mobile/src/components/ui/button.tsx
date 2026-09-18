import { useCallback } from 'react';
import {
  Pressable,
  View,
  type AccessibilityProps,
  type GestureResponderEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { cx } from '@/lib/cx';

import { Text } from './text';

const OFFSET = 4; // matches `shadow-retro` (4px 4px 0px)

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonProps = AccessibilityProps & {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  variant?: 'primary';
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
  className,
  fullWidth = false,
  accessibilityLabel,
  ...accessibilityProps
}: ButtonProps) {
  const pressed = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pressed.value * OFFSET },
      { translateY: pressed.value * OFFSET },
    ],
  }));

  const handlePressIn = useCallback(() => {
    if (disabled || reduceMotion) return;
    pressed.value = withTiming(1, { duration: 80 });
  }, [disabled, reduceMotion, pressed]);

  const handlePressOut = useCallback(() => {
    if (disabled || reduceMotion) return;
    pressed.value = withTiming(0, { duration: 120 });
  }, [disabled, reduceMotion, pressed]);

  return (
    <View className={cx('relative', fullWidth ? 'w-full' : 'self-start')}>
      <View
        pointerEvents="none"
        className="absolute inset-0 translate-x-1 translate-y-1 bg-border-color"
      />
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={accessibilityLabel ?? title}
        disabled={disabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={animatedStyle}
        className={cx(
          'min-h-11 min-w-11 flex-row items-center justify-center border-3 border-border-color px-6 py-3',
          disabled ? 'bg-[#ffb6c1]' : 'bg-accent',
          fullWidth && 'w-full',
          className,
        )}
        {...accessibilityProps}
      >
        <Text
          variant="display-lg"
          color="white"
          className="uppercase tracking-[2px]"
        >
          {title}
        </Text>
      </AnimatedPressable>
    </View>
  );
}
