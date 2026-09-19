import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect, type Href } from 'expo-router';
import { type MySession, SESSION_STATUSES } from '@youandi/shared';

import { Card } from '@/components/ui/card';
import { Text, type TextColor } from '@/components/ui/text';
import { ApiError, NetworkError, TimeoutError, getMySessions } from '@/lib/api';
import { saveSession } from '@/lib/storage';

function formatCategory(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function statusForSession(session: MySession): {
  label: string;
  color: TextColor;
} {
  const {
    status,
    partnerJoined,
    yourAnswerCount,
    partnerAnswerCount,
    totalExpected,
  } = session;

  if (status === SESSION_STATUSES.WAITING) {
    return partnerJoined
      ? { label: 'Your turn', color: 'accent' }
      : { label: 'Waiting for them', color: 'muted' };
  }

  if (status === SESSION_STATUSES.ACTIVE) {
    if (yourAnswerCount < totalExpected) {
      return { label: 'Your turn', color: 'accent' };
    }
    if (partnerAnswerCount < totalExpected) {
      return { label: 'Waiting for results', color: 'muted' };
    }
    return { label: 'Waiting for results', color: 'muted' };
  }

  if (status === SESSION_STATUSES.COMPLETED) {
    return { label: 'Finished', color: 'primary' };
  }

  if (status === SESSION_STATUSES.EXPIRED) {
    return { label: 'Expired', color: 'muted' };
  }

  return { label: session.statusLabel, color: 'secondary' };
}

function routeForSession(session: MySession): string | null {
  switch (session.status) {
    case SESSION_STATUSES.WAITING:
      return `/lobby/${session.id}`;
    case SESSION_STATUSES.ACTIVE:
      return `/quiz/${session.id}`;
    case SESSION_STATUSES.COMPLETED:
      return `/results/${session.id}`;
    default:
      return null;
  }
}

type ActiveGamesListProps = {
  onError?: (message: string) => void;
};

export default function ActiveGamesList({ onError }: ActiveGamesListProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState<MySession[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMySessions();
      setSessions(data);
    } catch (err) {
      if (
        err instanceof NetworkError ||
        err instanceof TimeoutError ||
        (err instanceof ApiError && err.status >= 500)
      ) {
        onError?.("Couldn't load your games.");
      } else if (err instanceof ApiError) {
        onError?.(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handlePress = useCallback(
    async (session: MySession) => {
      const route = routeForSession(session);
      if (!route) return;

      await saveSession({
        sessionId: session.id,
        playerId: session.playerId,
        role: session.role,
        category: session.category,
        questionCount: session.questionCount,
        savedAt: new Date().toISOString(),
      });

      router.push(route as Href);
    },
    [router],
  );

  if (sessions.length === 0 && !loading) {
    return null;
  }

  return (
    <View className="mt-8">
      <Text
        variant="body-sm"
        color="muted"
        className="mb-3 uppercase tracking-widest"
      >
        Active games
      </Text>

      <View className="gap-3">
        {sessions.map((session) => {
          const status = statusForSession(session);
          return (
            <Pressable
              key={session.id}
              onPress={() => handlePress(session)}
              accessibilityRole="button"
              accessibilityLabel={`${formatCategory(session.category)} game, ${status.label}`}
            >
              <Card className="py-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text variant="body" bold color="primary">
                      {formatCategory(session.category)}
                    </Text>
                    <Text variant="body-xs" color="muted">
                      {session.questionCount} questions ·{' '}
                      {session.role === 'player1' ? 'Host' : 'Player 2'}
                    </Text>
                  </View>
                  <View className="border-2 border-border-color bg-bg-secondary px-3 py-1">
                    <Text variant="body-xs" bold color={status.color}>
                      {status.label}
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
