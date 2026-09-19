import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
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
  joinSessionByCode,
} from '@/lib/api';
import {
  getActiveSession,
  saveSession,
  type SessionRecord,
} from '@/lib/storage';

const HOME_CATEGORIES: Category[] = CATEGORIES.slice(0, 5);
const SPICY_CATEGORY = CATEGORIES[4];
const COUNT_OPTIONS: number[] = [5, 10, 15, 20];

function formatCategory(category: Category): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function HomeScreen() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState<Category>(
    HOME_CATEGORIES[0],
  );
  const [selectedCount, setSelectedCount] = useState<number>(10);
  const [activeSession, setActiveSession] = useState<SessionRecord | null>(
    null,
  );
  const [isPending, setIsPending] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [error, setError] = useState<{
    message: string;
    canRetry: boolean;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    getActiveSession()
      .then((session) => {
        if (mounted) setActiveSession(session);
      })
      .catch(() => {
        // Storage read failures are non-fatal; the user can still start a new game.
      });
    return () => {
      mounted = false;
    };
  }, []);

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

  const handleRejoin = useCallback(() => {
    if (activeSession) {
      router.push(`/lobby/${activeSession.sessionId}`);
    }
  }, [activeSession, router]);

  const handleCreateSession = useCallback(async () => {
    if (isPending) return;

    setIsPending(true);
    setError(null);
    setCreatedCode(null);

    try {
      const { sessionId, playerId, code } = await createSession({
        category: selectedCategory,
        questionCount: selectedCount,
      });

      await saveSession({
        sessionId,
        playerId,
        role: 'player1',
        category: selectedCategory,
        questionCount: selectedCount,
        roomCode: code,
        savedAt: new Date().toISOString(),
      });

      setCreatedCode(code);
      router.push(`/lobby/${sessionId}`);
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
            : 'Could not create session. Please try again.';
        setError({ message, canRetry: true });
      }
    }
  }, [isPending, selectedCategory, selectedCount, router]);

  const handleJoinSession = useCallback(async () => {
    if (isPending || !joinCode.trim()) return;

    setIsPending(true);
    setError(null);

    try {
      const joined = await joinSessionByCode(joinCode.trim());

      await saveSession({
        sessionId: joined.sessionId,
        playerId: joined.playerId,
        role: 'player2',
        category: joined.category,
        questionCount: joined.questionCount,
        savedAt: new Date().toISOString(),
      });

      router.push(`/lobby/${joined.sessionId}`);
    } catch (err) {
      setIsPending(false);

      if (err instanceof NetworkError || err instanceof TimeoutError) {
        setError({
          message: "You're offline. Check your connection and try again.",
          canRetry: true,
        });
      } else if (err instanceof ApiError && err.status === 404) {
        setError({
          message: 'Game not found. Check the code and try again.',
          canRetry: true,
        });
      } else if (err instanceof ApiError && err.status === 400) {
        const message =
          err instanceof Error
            ? err.message
            : 'This game is no longer joinable.';
        setError({ message, canRetry: false });
      } else if (err instanceof ApiError && err.status >= 500) {
        setError({
          message: 'Something went wrong on our end. Please try again.',
          canRetry: true,
        });
      } else {
        const message =
          err instanceof Error
            ? err.message
            : 'Could not join session. Please try again.';
        setError({ message, canRetry: true });
      }
    }
  }, [isPending, joinCode, router]);

  return (
    <Screen>
      <ScrollView className="flex-1">
        <View className="flex-grow justify-center px-6 py-8">
          {activeSession && (
            <Pressable
              onPress={handleRejoin}
              accessibilityRole="button"
              accessibilityLabel="Rejoin game in progress"
              className="mb-6 min-h-11 border-2 border-border-color bg-bg-card p-4"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text variant="body-sm" color="secondary">
                You have a game in progress.
              </Text>
              <Text variant="body" bold color="accent">
                Tap to rejoin →
              </Text>
            </Pressable>
          )}

          <Text
            variant="display-xl"
            color="primary"
            className="mb-2 text-center"
          >
            You & I
          </Text>
          <Text variant="body" color="secondary" className="mb-8 text-center">
            Pick a category and question count to start.
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

          <View className="mb-8">
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

          {error && (
            <Text variant="body-sm" color="accent" className="mb-4 text-center">
              {error.message}
            </Text>
          )}

          <View className="items-center">
            <Button
              title={
                isPending
                  ? 'CREATING GAME…'
                  : error?.canRetry
                    ? 'TRY AGAIN'
                    : 'START GAME'
              }
              onPress={handleCreateSession}
              disabled={isPending}
            />
          </View>

          <View className="mt-8 gap-4">
            <Text
              variant="body-sm"
              color="muted"
              className="text-center uppercase tracking-widest"
            >
              Or join with a code
            </Text>
            <TextInput
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder="ENTER 6-DIGIT CODE"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              editable={!isPending}
              className="border-2 border-border-color bg-bg-secondary p-3 text-center font-body text-text-primary"
              style={{ fontSize: 18, letterSpacing: 4 }}
            />
            <Button
              title={isPending ? 'JOINING…' : 'JOIN GAME'}
              onPress={handleJoinSession}
              disabled={isPending || joinCode.trim().length < 6}
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
