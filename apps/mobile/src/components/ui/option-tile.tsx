import { useCallback, useEffect } from 'react';
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

const OFFSET = 4; // matches `shadow-retro`

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type OptionTileProps = AccessibilityProps & {
  label: string;
  selected?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
};

/**
 * Native port of web's `.option-card`/`.option-card.selected` (globals.css)
 * — the MCQ answer tiles on the quiz screen. Selected state permanently
 * pushes the tile to the shadow's offset and drops the shadow (mirrors
 * `.selected { translate-x-4 translate-y-4 shadow-none }`); an unselected
 * press nudges it partway there as momentary feedback, springing back on
 * release.
 */
export function OptionTile({
  label,
  selected = false,
  onPress,
  disabled = false,
  accessibilityLabel,
  ...accessibilityProps
}: OptionTileProps) {
  const offset = useSharedValue(selected ? 1 : 0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    offset.value = withTiming(selected ? 1 : 0, {
      duration: reduceMotion ? 0 : 150,
    });
  }, [offset, selected, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offset.value * OFFSET },
      { translateY: offset.value * OFFSET },
    ],
  }));

  const handlePressIn = useCallback(() => {
    if (disabled || selected || reduceMotion) return;
    offset.value = withTiming(0.5, { duration: 80 });
  }, [disabled, offset, selected, reduceMotion]);

  const handlePressOut = useCallback(() => {
    if (disabled || selected || reduceMotion) return;
    offset.value = withTiming(0, { duration: 120 });
  }, [disabled, offset, selected, reduceMotion]);

  return (
    <View className="relative mb-3">
      <View
        pointerEvents="none"
        className="absolute inset-0 translate-x-1 translate-y-1 bg-border-color"
      />
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityState={{ disabled, selected }}
        accessibilityLabel={accessibilityLabel ?? label}
        disabled={disabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={animatedStyle}
        className={cx(
          'min-h-11 min-w-11 border-3 border-border-color p-4',
          selected ? 'bg-accent' : 'bg-bg-card',
        )}
        {...accessibilityProps}
      >
        <Text variant="body" bold color={selected ? 'white' : 'primary'}>
          {label}
        </Text>
      </AnimatedPressable>
    </View>
  );
}
