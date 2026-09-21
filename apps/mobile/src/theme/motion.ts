import {
  AccessibilityInfo,
  Pressable,
  type PressableProps,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  createElement,
  useCallback,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

export const motion = {
  spring: {
    standard: {
      damping: 18,
      stiffness: 180,
      mass: 1,
    } satisfies WithSpringConfig,
    gentle: { damping: 22, stiffness: 110, mass: 1 } satisfies WithSpringConfig,
  },
  timing: {
    micro: {
      duration: 120,
      easing: Easing.bezier(0.2, 0, 0, 1),
      stagger: 0,
    } satisfies WithTimingConfig & { stagger: number },
    standard: { duration: 220, stagger: 0 } satisfies WithTimingConfig & {
      stagger: number;
    },
    entrance: { duration: 320, stagger: 60 } satisfies WithTimingConfig & {
      stagger: number;
    },
  },
} as const;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function useAccessibilityReduceMotion(): boolean {
  const systemReduceMotion = useReducedMotion();
  const [reduceMotion, setReduceMotion] = useState(systemReduceMotion);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

export type MotionPressableProps = PressableProps & {
  haptic?: boolean;
};

export function MotionPressable({
  children,
  haptic = true,
  onPressIn,
  onPressOut,
  ...props
}: MotionPressableProps) {
  const reduceMotion = useAccessibilityReduceMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (event: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
      if (haptic) void Haptics.selectionAsync();
      scale.value = reduceMotion ? 1 : withSpring(0.97, motion.spring.standard);
      onPressIn?.(event);
    },
    [haptic, onPressIn, reduceMotion, scale],
  );

  const handlePressOut = useCallback(
    (event: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
      scale.value = reduceMotion ? 1 : withSpring(1, motion.spring.standard);
      onPressOut?.(event);
    },
    [onPressOut, reduceMotion, scale],
  );

  return createElement(AnimatedPressable, {
    ...props,
    onPressIn: handlePressIn,
    onPressOut: handlePressOut,
    style: [props.style, animatedStyle],
    children,
  });
}

export type FadeInStaggerProps = PropsWithChildren<{
  index?: number;
  style?: Parameters<typeof Animated.View>[0]['style'];
}>;

export function FadeInStagger({
  children,
  index = 0,
  style,
}: FadeInStaggerProps) {
  const reduceMotion = useAccessibilityReduceMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);
    progress.value = reduceMotion
      ? 1
      : withDelay(
          index * motion.timing.entrance.stagger,
          withTiming(1, motion.timing.entrance),
        );
  }, [index, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 12 }],
  }));

  return createElement(Animated.View, {
    style: [style, animatedStyle],
    children,
  });
}

export type CountUpOptions = {
  duration?: number;
};

export function useCountUp(
  finalValue: number,
  { duration = 1500 }: CountUpOptions = {},
): {
  progress: SharedValue<number>;
  value: ReturnType<typeof useDerivedValue<number>>;
} {
  const reduceMotion = useAccessibilityReduceMotion();
  const progress = useSharedValue(0);
  const value = useDerivedValue(
    () => progress.value * finalValue,
    [finalValue],
  );

  useEffect(() => {
    cancelAnimation(progress);
    progress.value = reduceMotion
      ? 1
      : withTiming(1, {
          duration,
          easing: Easing.out(Easing.cubic),
        });
  }, [duration, progress, reduceMotion]);

  return { progress, value };
}
