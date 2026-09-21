import {
  View,
  type AccessibilityProps,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native';

import { MotionPressable, useTheme } from '@/theme';

import { Text } from './text';

export type CategoryTileProps = AccessibilityProps & {
  name: string;
  emoji: string;
  description?: string;
  spicy?: boolean;
  selected?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
};

export function CategoryTile({
  name,
  emoji,
  description,
  spicy = false,
  selected = false,
  onPress,
  style,
  accessibilityLabel,
  ...props
}: CategoryTileProps) {
  const theme = useTheme();
  return (
    <MotionPressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? name}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        {
          minHeight: 96,
          minWidth: 48,
          padding: 18,
          borderRadius: theme.radius.card,
          backgroundColor: selected || spicy ? theme.ink : theme.card,
          borderWidth: selected ? 1.5 : 0,
          borderColor: theme.ink,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        },
        style,
      ]}
    >
      <Text variant="display">{emoji}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          variant="title"
          color={selected || spicy ? 'white' : 'primary'}
          bold
        >
          {name}
        </Text>
        {description ? (
          <Text
            variant="label"
            color={selected || spicy ? 'white' : 'secondary'}
          >
            {description}
          </Text>
        ) : null}
      </View>
    </MotionPressable>
  );
}

export function SpicyCategoryTile(props: Omit<CategoryTileProps, 'spicy'>) {
  return <CategoryTile {...props} spicy />;
}
