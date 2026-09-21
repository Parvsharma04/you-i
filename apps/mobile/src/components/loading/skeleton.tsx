import { LinearGradient } from 'expo-linear-gradient';
import {
  AccessibilityInfo,
  View,
  type ViewStyle,
  type LayoutChangeEvent,
} from 'react-native';
import {
  cancelAnimation,
  makeMutable,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from 'react';

import { cx } from '@/lib/cx';
import { useTheme } from '@/theme';

const shimmer = makeMutable(0);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
let skeletonUsers = 0;

function useShimmer() {
  const reduceMotion = useReducedMotion();
  const [systemReduceMotion, setSystemReduceMotion] = useState(
    reduceMotion ?? false,
  );

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setSystemReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setSystemReduceMotion,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    skeletonUsers += 1;
    if (skeletonUsers === 1 && !systemReduceMotion) {
      shimmer.value = withRepeat(withTiming(1, { duration: 1250 }), -1, false);
    }

    return () => {
      skeletonUsers -= 1;
      if (skeletonUsers === 0) cancelAnimation(shimmer);
    };
  }, [systemReduceMotion]);

  return { reduceMotion: systemReduceMotion };
}

type SkeletonProps = {
  width: ViewStyle['width'];
  height: ViewStyle['height'];
  radius?: number;
  className?: string;
};

export function Skeleton({
  width,
  height,
  radius = 8,
  className,
}: SkeletonProps) {
  const { reduceMotion } = useShimmer();
  const { line, surface } = useTheme();
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -180 + shimmer.value * 360 }],
  }));

  return (
    <View
      accessible={false}
      className={cx('overflow-hidden', className)}
      style={{ width, height, borderRadius: radius, backgroundColor: surface }}
    >
      {reduceMotion ? (
        <View style={{ flex: 1, backgroundColor: line }} />
      ) : (
        <AnimatedLinearGradient
          colors={[surface, line, surface]}
          locations={[0.25, 0.5, 0.75]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[{ ...StyleSheetAbsoluteFill }, shimmerStyle]}
        />
      )}
    </View>
  );
}

export function SkeletonText({
  lines,
  lastLineWidth = '70%',
  className,
}: {
  lines: number;
  lastLineWidth?: ViewStyle['width'];
  className?: string;
}) {
  return (
    <View className={cx('gap-2', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? lastLineWidth : '100%'}
          height={14}
          radius={4}
        />
      ))}
    </View>
  );
}

const StyleSheetAbsoluteFill: ViewStyle = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  width: '200%',
};

export function SkeletonSwap({
  isLoading,
  children,
  skeleton,
  className,
}: PropsWithChildren<{
  isLoading: boolean;
  skeleton: ReactNode;
  className?: string;
}>) {
  const progress = useSharedValue(isLoading ? 0 : 1);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    progress.value = withTiming(isLoading ? 0 : 1, { duration: 220 });
  }, [isLoading, progress]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const contentStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const skeletonStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
  }));
  const onLayout = useCallback((event: LayoutChangeEvent | null) => {
    if (!mountedRef.current) return;

    const nextHeight = event?.nativeEvent?.layout?.height;
    if (typeof nextHeight !== 'number' || !Number.isFinite(nextHeight)) {
      return;
    }

    setMeasuredHeight((height) => Math.max(height ?? 0, nextHeight));
  }, []);

  return (
    <View
      className={cx('relative', className)}
      style={
        measuredHeight === null ? undefined : { minHeight: measuredHeight }
      }
    >
      <Animated.View style={contentStyle} onLayout={onLayout}>
        {children}
      </Animated.View>
      <Animated.View
        pointerEvents={isLoading ? 'auto' : 'none'}
        className="absolute inset-0"
        style={skeletonStyle}
        onLayout={onLayout}
      >
        {skeleton}
      </Animated.View>
    </View>
  );
}
