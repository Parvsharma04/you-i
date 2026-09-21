import {
  ActivityIndicator,
  View,
  type AccessibilityProps,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native';

import { MotionPressable, useTheme } from '@/theme';

import { Text } from './text';

export type ButtonProps = AccessibilityProps & {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  pending?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
  style?: ViewStyle;
};

export function Button({
  title,
  onPress,
  disabled = false,
  pending = false,
  loading = false,
  variant = 'primary',
  fullWidth = false,
  style,
  accessibilityLabel,
  ...accessibilityProps
}: ButtonProps) {
  const theme = useTheme();
  const isPending = pending || loading;
  const primary = variant === 'primary';
  return (
    <MotionPressable
      {...accessibilityProps}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: disabled || isPending, busy: isPending }}
      disabled={disabled || isPending}
      onPress={onPress}
      style={[
        {
          minHeight: 56,
          minWidth: 48,
          width: fullWidth ? '100%' : undefined,
          paddingHorizontal: 22,
          borderRadius: 18,
          borderWidth: primary ? 0 : 1.5,
          borderColor: theme.ink,
          backgroundColor: primary ? theme.ink : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <View
        style={{ minWidth: 96, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text
          color={primary ? 'white' : 'primary'}
          variant="label"
          bold
          style={{ opacity: isPending ? 0 : 1 }}
        >
          {title}
        </Text>
        {isPending ? (
          <ActivityIndicator
            color={primary ? theme.card : theme.ink}
            style={{ position: 'absolute' }}
          />
        ) : null}
      </View>
    </MotionPressable>
  );
}
