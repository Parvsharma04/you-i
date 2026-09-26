import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useAccessibilityReduceMotion, useTheme } from '@/theme';

import { Text } from './text';

export type ScoreVennProps = {
  score: number;
  size?: number;
  accessibilityLabel?: string;
};

export function ScoreVenn({
  score,
  size = 180,
  accessibilityLabel = `Compatibility score ${score}`,
}: ScoreVennProps) {
  const theme = useTheme();
  const reduceMotion = useAccessibilityReduceMotion();
  const scoreValue = useSharedValue(0);
  useEffect(() => {
    scoreValue.value = reduceMotion
      ? score
      : withTiming(score, { duration: 500 });
  }, [reduceMotion, score, scoreValue]);
  const separation = useDerivedValue(
    () => (1 - Math.max(0, Math.min(scoreValue.value, 100)) / 100) * size * 0.3,
  );
  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -separation.value }],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: separation.value }],
  }));
  const diameter = size * 0.62;
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            backgroundColor: theme.ink,
            opacity: 0.88,
          },
          leftStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            backgroundColor: theme.accent,
            opacity: 0.8,
          },
          rightStyle,
        ]}
      />
      <Text variant="display" color="white" bold>
        {Math.round(score)}
      </Text>
    </View>
  );
}
