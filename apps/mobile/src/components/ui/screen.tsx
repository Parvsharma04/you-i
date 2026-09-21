import { ScrollView, type ScrollViewProps } from 'react-native';
import {
  SafeAreaView,
  type SafeAreaViewProps,
} from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

export type ScreenProps = SafeAreaViewProps & {
  background?: boolean;
  scroll?: boolean;
  scrollViewProps?: Omit<ScrollViewProps, 'children'>;
};

export function Screen({
  background = true,
  scroll = false,
  scrollViewProps,
  style,
  children,
  ...props
}: ScreenProps) {
  const theme = useTheme();
  const content = scroll ? (
    <ScrollView
      {...scrollViewProps}
      style={[{ flex: 1 }, scrollViewProps?.style]}
      contentContainerStyle={[
        { flexGrow: 1 },
        scrollViewProps?.contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <SafeAreaView
      {...props}
      style={[
        {
          flex: 1,
          backgroundColor: background ? theme.surface : 'transparent',
        },
        style,
      ]}
    >
      {content}
    </SafeAreaView>
  );
}
