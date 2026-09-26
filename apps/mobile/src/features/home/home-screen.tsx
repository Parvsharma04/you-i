import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/theme';
import ActiveGamesList from './active-games-list';

export default function HomeScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { setCategory } = useTheme();

  useEffect(() => {
    setCategory(null);
  }, [setCategory]);

  const handleListError = useCallback((message: string) => {
    setError(message);
  }, []);

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setRefreshKey((key) => key + 1);
            }}
          />
        }
      >
        <View className="flex-grow px-6 py-8">
          <Text variant="title" bold color="primary" className="mb-10">
            You & I
          </Text>
          <Text variant="display-xl" color="primary" className="mb-8">
            Find out how in sync you are.
          </Text>

          <View className="flex-row gap-3">
            <View className="flex-[1.25]">
              <Button
                title="START A GAME"
                onPress={() => router.push('/create')}
                fullWidth
              />
            </View>
            <View className="flex-1">
              <Button
                title="JOIN"
                variant="secondary"
                onPress={() => router.push('/join')}
                fullWidth
              />
            </View>
          </View>

          {error && (
            <Text variant="body-sm" color="accent" className="mt-4 text-center">
              {error}
            </Text>
          )}

          <ActiveGamesList
            onError={handleListError}
            refreshKey={refreshKey}
            onRefreshComplete={() => setRefreshing(false)}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
