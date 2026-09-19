import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import ActiveGamesList from './active-games-list';

export default function HomeScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleListError = useCallback((message: string) => {
    setError(message);
  }, []);

  return (
    <Screen>
      <ScrollView className="flex-1">
        <View className="flex-grow justify-center px-6 py-8">
          <Text
            variant="display-xl"
            color="primary"
            className="mb-2 text-center"
          >
            You & I
          </Text>
          <Text variant="body" color="secondary" className="mb-8 text-center">
            A two-player compatibility game.
          </Text>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                title="START A GAME"
                onPress={() => router.push('/create')}
                fullWidth
              />
            </View>
            <View className="flex-1">
              <Button
                title="JOIN A GAME"
                onPress={() => router.push('/join')}
                fullWidth
              />
            </View>
          </View>

          <View className="mt-3">
            <Button
              title="PASS & PLAY"
              variant="secondary"
              onPress={() => router.push('/pass-and-play')}
              fullWidth
            />
          </View>

          {error && (
            <Text variant="body-sm" color="accent" className="mt-4 text-center">
              {error}
            </Text>
          )}

          <ActiveGamesList onError={handleListError} />
        </View>
      </ScrollView>
    </Screen>
  );
}
