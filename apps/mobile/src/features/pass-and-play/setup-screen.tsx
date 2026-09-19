import { useCallback, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CATEGORIES, type Category } from '@youandi/shared';

import { Button } from '@/components/ui/button';
import { OptionTile } from '@/components/ui/option-tile';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import {
  ApiError,
  NetworkError,
  TimeoutError,
  createSession,
  joinSession,
} from '@/lib/api';
import { saveSession } from '@/lib/storage';

const HOME_CATEGORIES: Category[] = CATEGORIES.slice(0, 5);
const SPICY_CATEGORY = CATEGORIES[4];
const COUNT_OPTIONS: number[] = [5, 10, 15, 20];

function formatCategory(category: Category): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function PassAndPlaySetupScreen() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState<Category>(
    HOME_CATEGORIES[0],
  );
  const [selectedCount, setSelectedCount] = useState<number>(10);
  const [player1Name, setPlayer1Name] = useState('Player 1');
  const [player2Name, setPlayer2Name] = useState('Player 2');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<{
    message: string;
    canRetry: boolean;
  } | null>(null);

  const handleSelectCategory = useCallback((category: Category) => {
    void Haptics.selectionAsync();
    if (category === SPICY_CATEGORY) {
      // TODO(phase 11): show an age-confirmation gate before selecting 'spicy'.
    }
    setSelectedCategory(category);
    setError(null);
  }, []);

  const handleSelectCount = useCallback((count: number) => {
    setSelectedCount(count);
    setError(null);
  }, []);

  const handleStart = useCallback(async () => {
    if (isPending) return;

    setIsPending(true);
    setError(null);

    try {
      const {
        sessionId,
        playerId: player1Id,
        code,
      } = await createSession({
        category: selectedCategory,
        questionCount: selectedCount,
      });

      const { playerId: player2Id } = await joinSession({
        sessionId,
        passAndPlay: true,
      });

      await saveSession({
        sessionId,
        playerId: player1Id,
        role: 'player1',
        category: selectedCategory,
        questionCount: selectedCount,
        roomCode: code,
        savedAt: new Date().toISOString(),
        passAndPlay: true,
        player1Id,
        player2Id,
        player1Name: player1Name.trim() || 'Player 1',
        player2Name: player2Name.trim() || 'Player 2',
      });

      router.replace(`/pass-and-play/${sessionId}`);
    } catch (err) {
      setIsPending(false);

      if (err instanceof NetworkError || err instanceof TimeoutError) {
        setError({
          message: "You're offline. Check your connection and try again.",
          canRetry: true,
        });
      } else if (err instanceof ApiError && err.status === 429) {
        setError({
          message: 'You are creating games too quickly. Slow down.',
          canRetry: true,
        });
      } else if (err instanceof ApiError && err.status >= 500) {
        setError({
          message: 'Something went wrong on our end. Please try again.',
          canRetry: true,
        });
      } else {
        const message =
          err instanceof Error
            ? err.message
            : 'Could not start pass-and-play game. Please try again.';
        setError({ message, canRetry: true });
      }
    }
  }, [
    isPending,
    selectedCategory,
    selectedCount,
    player1Name,
    player2Name,
    router,
  ]);

  return (
    <Screen>
      <ScrollView className="flex-1">
        <View className="flex-grow justify-center px-6 py-8">
          <Text
            variant="display-xl"
            color="primary"
            className="mb-2 text-center"
          >
            PASS & PLAY
          </Text>
          <Text variant="body" color="secondary" className="mb-8 text-center">
            One phone. Two players. No codes.
          </Text>

          <View className="mb-6">
            <Text
              variant="body-sm"
              color="muted"
              className="mb-3 uppercase tracking-widest"
            >
              Category
            </Text>
            {HOME_CATEGORIES.map((category) => (
              <OptionTile
                key={category}
                label={formatCategory(category)}
                selected={selectedCategory === category}
                disabled={isPending}
                onPress={() => handleSelectCategory(category)}
              />
            ))}
          </View>

          <View className="mb-6">
            <Text
              variant="body-sm"
              color="muted"
              className="mb-3 uppercase tracking-widest"
            >
              Questions
            </Text>
            <View className="flex-row gap-2">
              {COUNT_OPTIONS.map((count) => (
                <View key={count} className="flex-1">
                  <OptionTile
                    label={String(count)}
                    selected={selectedCount === count}
                    disabled={isPending}
                    onPress={() => handleSelectCount(count)}
                  />
                </View>
              ))}
            </View>
          </View>

          <View className="mb-8 gap-4">
            <Text
              variant="body-sm"
              color="muted"
              className="uppercase tracking-widest"
            >
              Names (optional)
            </Text>
            <TextInput
              value={player1Name}
              onChangeText={setPlayer1Name}
              placeholder="Player 1 name"
              placeholderTextColor="#cd5c5c"
              editable={!isPending}
              maxLength={20}
              className="border-3 border-border-color bg-bg-card px-4 py-3 font-body text-base text-text-primary"
            />
            <TextInput
              value={player2Name}
              onChangeText={setPlayer2Name}
              placeholder="Player 2 name"
              placeholderTextColor="#cd5c5c"
              editable={!isPending}
              maxLength={20}
              className="border-3 border-border-color bg-bg-card px-4 py-3 font-body text-base text-text-primary"
            />
          </View>

          {error && (
            <Text variant="body-sm" color="accent" className="mb-4 text-center">
              {error.message}
            </Text>
          )}

          <View className="items-center">
            <Button
              title={
                isPending
                  ? 'STARTING…'
                  : error?.canRetry
                    ? 'TRY AGAIN'
                    : 'START GAME'
              }
              onPress={handleStart}
              disabled={isPending}
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
