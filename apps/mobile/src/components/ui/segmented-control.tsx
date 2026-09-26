import { View, type GestureResponderEvent } from 'react-native';

import { MotionPressable, useTheme } from '@/theme';

import { Text } from './text';

export type SegmentedControlOption<T extends string | number> = {
  label: string;
  value: T;
};

export type SegmentedControlProps<T extends string | number> = {
  options: readonly SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T, event: GestureResponderEvent) => void;
  disabled?: boolean;
};

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  disabled = false,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  return (
    <View
      className="flex-row p-1"
      style={{
        borderRadius: theme.radius.tile,
        borderWidth: 1.5,
        borderColor: theme.line,
        backgroundColor: theme.card,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <MotionPressable
            key={String(option.value)}
            className="min-h-12 flex-1 items-center justify-center px-2"
            style={{
              borderRadius: theme.radius.tile - 4,
              borderWidth: selected ? 1.5 : 0,
              borderColor: theme.ink,
            }}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            onPress={(event) => onChange(option.value, event)}
          >
            <Text variant="label" bold color="primary">
              {option.label}
            </Text>
          </MotionPressable>
        );
      })}
    </View>
  );
}
