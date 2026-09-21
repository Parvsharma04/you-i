import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme';

export type CardProps = ViewProps & {
  shadowSize?: 'sm' | 'md' | 'lg';
};

export function Card({
  style,
  children,
  shadowSize: _shadowSize,
  ...props
}: CardProps) {
  const theme = useTheme();
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: theme.card,
          borderRadius: theme.radius.card,
          padding: theme.spacing[22],
          shadowColor: theme.ink,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.22,
          shadowRadius: 12,
          elevation: 3,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
