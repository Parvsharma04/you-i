import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useAccessibilityReduceMotion } from '@/theme';

import { Skeleton, SkeletonText } from './skeleton';

export function GamesListSkeleton() {
  return (
    <View className="mt-8">
      <Skeleton width={120} height={14} radius={4} className="mb-3" />
      <View className="gap-3">
        {[0, 1, 2].map((index) => (
          <Card key={index} className="py-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Skeleton width="55%" height={22} radius={4} />
                <Skeleton width="72%" height={17} radius={4} />
              </View>
              <Skeleton width={104} height={29} radius={2} />
            </View>
          </Card>
        ))}
      </View>
    </View>
  );
}

function ConvergingCircles({ apart = false }: { apart?: boolean }) {
  const reduceMotion = useAccessibilityReduceMotion();
  const left = useSharedValue(apart ? 0.35 : 1);
  const right = useSharedValue(apart ? 0.35 : 1);

  useEffect(() => {
    cancelAnimation(left);
    cancelAnimation(right);
    if (reduceMotion) {
      left.value = apart ? 0.35 : 1;
      right.value = apart ? 0.35 : 1;
      return;
    }
    left.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
    right.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
  }, [apart, left, reduceMotion, right]);

  const leftStyle = useAnimatedStyle(() => ({
    opacity: apart ? left.value : 0.45 + left.value * 0.55,
    transform: [{ translateX: -56 + left.value * 56 }],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    opacity: apart ? right.value : 0.45 + right.value * 0.55,
    transform: [{ translateX: 56 - right.value * 56 }],
  }));

  return (
    <View className="h-32 w-40 items-center justify-center">
      <Animated.View
        className="absolute h-24 w-24 rounded-full bg-accent"
        style={leftStyle}
      />
      <Animated.View
        className="absolute h-24 w-24 rounded-full bg-text-primary"
        style={rightStyle}
      />
    </View>
  );
}

export function GeneratingQuestions() {
  const reduceMotion = useAccessibilityReduceMotion();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(
      () => setStage((current) => (current + 1) % 3),
      1800,
    );
    return () => clearInterval(timer);
  }, [reduceMotion]);

  const copy = [
    ['BUILDING YOUR ROUND', 'Finding the right questions for both of you.'],
    ['TUNING THE VIBE', 'Making sure every stage feels like you.'],
    ['ALMOST READY', 'Your compatibility test is taking shape.'],
  ][stage];

  return (
    <View className="flex-1 items-center justify-center gap-6 px-6">
      <ConvergingCircles />
      <Text variant="display-md" color="primary" className="text-center">
        {copy[0]}
      </Text>
      <Text variant="body" color="secondary" className="text-center">
        {copy[1]}
      </Text>
    </View>
  );
}

export function GeneratingResult() {
  return (
    <View className="gap-6 px-6 py-8">
      <View className="items-center gap-3">
        <Skeleton width={92} height={34} radius={2} />
        <Skeleton width={190} height={58} radius={4} />
        <Skeleton width={110} height={16} radius={4} />
        <ConvergingCircles apart />
      </View>
      <Card>
        <View className="gap-4">
          <Skeleton width={170} height={26} radius={4} />
          <SkeletonText lines={4} lastLineWidth="82%" />
        </View>
      </Card>
      <Card>
        <View className="gap-4">
          <Skeleton width={110} height={26} radius={4} />
          <SkeletonText lines={2} lastLineWidth="60%" />
        </View>
      </Card>
    </View>
  );
}
