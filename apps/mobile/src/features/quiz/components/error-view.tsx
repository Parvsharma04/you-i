import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

type ErrorViewProps = {
  message: string;
  onRetry: () => void;
};

export function ErrorView({ message, onRetry }: ErrorViewProps) {
  return (
    <View className="flex-1 items-center justify-center gap-6 px-6 py-8">
      <Text variant="display-xl" color="primary">
        X_X
      </Text>
      <Text variant="display-md" color="primary" className="text-center">
        {message}
      </Text>
      <Button title="TRY AGAIN" onPress={onRetry} />
    </View>
  );
}
