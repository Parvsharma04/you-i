import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

type ErrorFallbackProps = {
  title?: string;
  message?: string;
  actionLabel?: string;
  onRetry: () => void;
};

export function ErrorFallback({
  title = 'SOMETHING WENT WRONG',
  message = 'The app hit an unexpected error.',
  actionLabel = 'TRY AGAIN',
  onRetry,
}: ErrorFallbackProps) {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={`${title}. ${message}. ${actionLabel}.`}
      className="flex-1 items-center justify-center gap-6 px-6"
    >
      <Text variant="display-xl" color="primary">
        X_X
      </Text>
      <Text variant="display-md" color="primary" className="text-center">
        {title}
      </Text>
      <Text variant="body" color="secondary" className="text-center">
        {message}
      </Text>
      <Button title={actionLabel} onPress={onRetry} />
    </View>
  );
}
