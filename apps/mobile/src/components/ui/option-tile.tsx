import {
  type AccessibilityProps,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native';

import { MotionPressable } from '@/theme';
import { useTheme } from '@/theme';

import { Text } from './text';

export type OptionTileProps = AccessibilityProps & {
  label: string;
  emoji?: string;
  selected?: boolean;
  correct?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: ViewStyle;
};

export function OptionTile({
  label,
  emoji,
  selected = false,
  correct = false,
  onPress,
  disabled = false,
  style,
  accessibilityLabel,
  ...accessibilityProps
}: OptionTileProps) {
  const theme = useTheme();
  return (
    <MotionPressable
      {...accessibilityProps}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={[
        {
          minHeight: 56,
          minWidth: 48,
          padding: 16,
          borderRadius: theme.radius.tile,
          borderWidth: correct ? 2 : 1.5,
          borderColor: selected || correct ? theme.ink : theme.line,
          backgroundColor: selected ? theme.ink : theme.card,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {emoji ? <Text variant="title">{emoji}</Text> : null}
      <Text variant="body" bold color={selected ? 'white' : 'primary'}>
        {label}
      </Text>
    </MotionPressable>
  );
}
