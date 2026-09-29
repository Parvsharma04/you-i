import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { GAPS, SECTION_MARGIN, SCREEN_PADDING } from '@/design-system';
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
        <View className={`flex-grow ${SCREEN_PADDING.x} ${SCREEN_PADDING.y}`}>
          <Text
            variant="title"
            bold
            color="primary"
            className={SECTION_MARGIN.heading}
          >
            You & I
          </Text>
          <Text
            variant="display-xl"
            color="primary"
            className={SECTION_MARGIN.beforeAction}
          >
            Find out how in sync you are.
          </Text>

          <View className={`flex-row ${GAPS.tight}`}>
            <View className="flex-[1.25]">
              <Button
                label="START A GAME"
                onPress={() => router.push('/create')}
                fullWidth
                size="lg"
              />
            </View>
            <View className="flex-1">
              <Button
                label="JOIN"
                variant="secondary"
                onPress={() => router.push('/join')}
                fullWidth
                size="lg"
              />
            </View>
          </View>

          {error && (
            <Text
              variant="body-sm"
              color="accent"
              className={`${SECTION_MARGIN.message} text-center`}
            >
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
