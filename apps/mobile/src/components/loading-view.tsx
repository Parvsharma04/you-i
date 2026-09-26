import { View } from 'react-native';

import { Text } from '@/components/ui/text';

type LoadingViewProps = {
  title: string;
  subtitle?: string;
};

export function LoadingView({ title, subtitle }: LoadingViewProps) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      className="flex-1 items-center justify-center gap-4 px-6"
    >
      <Text variant="display-md" color="primary" className="text-center">
        {title}
      </Text>
      {subtitle && (
        <Text variant="body" color="secondary" className="text-center">
          {subtitle}
        </Text>
      )}
    </View>
  );
}
