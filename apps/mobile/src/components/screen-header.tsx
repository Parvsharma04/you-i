import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/theme';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  hideBackButton?: boolean;
}

export function ScreenHeader({
  title,
  onBack,
  hideBackButton = false,
}: ScreenHeaderProps) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View className="flex-row items-center border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800">
      {hideBackButton ? (
        <View className="h-12 w-12" />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={onBack ?? (() => router.back())}
          className="h-12 w-12 items-center justify-center rounded-full active:opacity-70"
        >
          <SymbolView
            name={{
              ios: 'chevron.left',
              android: 'chevron_left',
              web: 'chevron_left',
            }}
            size={24}
            weight="medium"
            tintColor={theme.ink}
          />
        </Pressable>
      )}

      <Text
        variant="title"
        bold
        color="primary"
        numberOfLines={1}
        className="flex-1 text-center"
      >
        {title}
      </Text>

      <View className="h-12 w-12" />
    </View>
  );
}
