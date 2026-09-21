import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect, type Href } from 'expo-router';
import { type MySession, SESSION_STATUSES } from '@youandi/shared';

import { Card } from '@/components/ui/card';
import {
  GamesListSkeleton,
  SkeletonSwap,
  useMinimumDuration,
} from '@/components/loading';
import { Text, type TextColor } from '@/components/ui/text';
import { ApiError, NetworkError, TimeoutError, getMySessions } from '@/lib/api';
import { getSession, saveSession } from '@/lib/storage';
import { FadeInStagger, MotionPressable } from '@/theme';

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
    passAndPlay,
    partnerJoined,
    yourAnswerCount,
    partnerAnswerCount,
    totalExpected,
  } = session;

  if (passAndPlay) {
    if (status === SESSION_STATUSES.ACTIVE) {
      const done = yourAnswerCount + partnerAnswerCount;
      return {
        label: `Pass & play · ${done}/${totalExpected * 2}`,
        color: 'accent',
      };
    }
    if (status === SESSION_STATUSES.COMPLETED) {
      return { label: 'Pass & play · Finished', color: 'primary' };
    }
  }

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
  if (session.passAndPlay) {
    switch (session.status) {
      case SESSION_STATUSES.ACTIVE:
        return `/pass-and-play/${session.id}`;
      case SESSION_STATUSES.COMPLETED:
        return `/results/${session.id}`;
      default:
        return null;
    }
  }

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
  const showLoading = useMinimumDuration(loading);

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

      if (session.passAndPlay) {
        const stored = await getSession(session.id);
        if (stored) {
          await saveSession({ ...stored, savedAt: new Date().toISOString() });
        } else {
          // Pass-and-play sessions need the locally-stored player ids and
          // names; without them we cannot resume safely.
          await saveSession({
            sessionId: session.id,
            playerId: session.playerId,
            role: session.role,
            category: session.category,
            questionCount: session.questionCount,
            passAndPlay: true,
            savedAt: new Date().toISOString(),
          });
        }
      } else {
        await saveSession({
          sessionId: session.id,
          playerId: session.playerId,
          role: session.role,
          category: session.category,
          questionCount: session.questionCount,
          savedAt: new Date().toISOString(),
        });
      }

      router.push(route as Href);
    },
    [router],
  );

  if (sessions.length === 0 && !showLoading) {
    return null;
  }

  const games = (
    <View className="mt-8">
      <Text
        variant="body-sm"
        color="muted"
        className="mb-3 uppercase tracking-widest"
      >
        Active games
      </Text>

      <View className="gap-3">
        {sessions.map((session, index) => {
          const status = statusForSession(session);
          return (
            <FadeInStagger key={session.id} index={index}>
              <MotionPressable
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
              </MotionPressable>
            </FadeInStagger>
          );
        })}
      </View>
    </View>
  );

  return (
    <SkeletonSwap isLoading={showLoading} skeleton={<GamesListSkeleton />}>
      {games}
    </SkeletonSwap>
  );
}
