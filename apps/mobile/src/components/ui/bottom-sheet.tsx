import { useCallback, useEffect, type ReactNode } from 'react';
import { Dimensions, Pressable, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useAccessibilityReduceMotion, useTheme } from '@/theme';

export type BottomSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  children: ReactNode;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

const DISMISS_DISTANCE = 120;

export function BottomSheet({
  visible,
  onDismiss,
  children,
  style,
  accessibilityLabel = 'Bottom sheet',
}: BottomSheetProps) {
  const theme = useTheme();
  const reduceMotion = useAccessibilityReduceMotion();
  const translateY = useSharedValue(Dimensions.get('window').height);
  useEffect(() => {
    translateY.value = visible
      ? reduceMotion
        ? 0
        : withSpring(0)
      : Dimensions.get('window').height;
  }, [reduceMotion, translateY, visible]);

  const dismiss = useCallback(() => onDismiss(), [onDismiss]);
  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_DISTANCE || event.velocityY > 900) {
        translateY.value = withSpring(Dimensions.get('window').height, {}, () =>
          runOnJS(dismiss)(),
        );
      } else {
        translateY.value = withSpring(0);
      }
    });
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  if (!visible) return null;
  return (
    <View
      style={{ position: 'absolute', inset: 0, justifyContent: 'flex-end' }}
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss bottom sheet"
        onPress={onDismiss}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: theme.ink,
          opacity: 0.25,
        }}
      />
      <GestureDetector gesture={gesture}>
        <Animated.View
          accessibilityRole="adjustable"
          accessibilityLabel={accessibilityLabel}
          style={[
            {
              minHeight: 48,
              width: '100%',
              padding: 22,
              paddingTop: 12,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              backgroundColor: theme.card,
            },
            sheetStyle,
            style,
          ]}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 5,
              borderRadius: 3,
              backgroundColor: theme.line,
              marginBottom: 16,
            }}
          />
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
