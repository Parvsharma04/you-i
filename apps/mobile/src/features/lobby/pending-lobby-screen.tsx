import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type Category } from '@youandi/shared';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { createSession } from '@/lib/api';
import { saveSession } from '@/lib/storage';

export default function PendingLobbyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category: Category;
    questionCount: string;
  }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const category = Array.isArray(params.category)
      ? params.category[0]
      : params.category;
    const questionCount = Number(
      Array.isArray(params.questionCount)
        ? params.questionCount[0]
        : params.questionCount,
    );
    if (!category || !Number.isInteger(questionCount)) {
      setError('Could not start this game.');
      return;
    }

    let mounted = true;
    void createSession({ category, questionCount })
      .then(async ({ sessionId, playerId, code }) => {
        await saveSession({
          sessionId,
          playerId,
          role: 'player1',
          category,
          questionCount,
          roomCode: code,
          savedAt: new Date().toISOString(),
        });
        if (mounted) router.replace(`/lobby/${sessionId}`);
      })
      .catch((cause: unknown) => {
        if (mounted) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Could not create this game.',
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, [params.category, params.questionCount, router]);

  return (
    <Screen>
      <ScreenContent error={error} onRetry={() => router.replace('/create')} />
    </Screen>
  );
}

function ScreenContent({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <ScreenContentFrame>
      <Text variant="display-md" bold className="text-center">
        {error ? 'Could not start the game' : 'Setting up your game'}
      </Text>
      <Text variant="body" color="secondary" className="text-center">
        {error ?? 'You can share the code as soon as the lobby is ready.'}
      </Text>
      {error ? <Button title="TRY AGAIN" onPress={onRetry} /> : null}
    </ScreenContentFrame>
  );
}

function ScreenContentFrame({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 items-center justify-center gap-5 px-6">
      {children}
    </View>
  );
}
