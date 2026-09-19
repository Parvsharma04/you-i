import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  type Category,
  type PlayerJoinedPayload,
  SESSION_STATUSES,
} from '@youandi/shared';

import { ErrorBoundary } from '@/components/error-boundary';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useGameSocket } from '@/hooks/useGameSocket';
import {
  useInterceptBack,
  useLeavingIntentionally,
} from '@/hooks/useInterceptBack';
import {
  ApiError,
  NetworkError,
  TimeoutError,
  getSessionState,
} from '@/lib/api';
import { getLastError, getLastState } from '@/lib/socket';
import {
  getSession as getStoredSession,
  type SessionRecord,
} from '@/lib/storage';

type LobbyStatus = 'loading' | 'host' | 'waiting' | 'error' | 'needsCode';

type ErrorKind = 'notFound' | 'full' | 'completed' | 'network' | 'unknown';

type LobbyError = {
  kind: ErrorKind;
  message: string;
  actionLabel: string;
};

function formatCategory(category: Category): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function LobbyScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams<{ sessionId: string }>();
  const sessionId = Array.isArray(rawParams.sessionId)
    ? rawParams.sessionId[0]
    : rawParams.sessionId;
  const { leavingIntentionallyRef, markLeaving } = useLeavingIntentionally();

  const [status, setStatus] = useState<LobbyStatus>('loading');
  const [lobbyError, setLobbyError] = useState<LobbyError | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [role, setRole] = useState<'player1' | 'player2' | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [questionCount, setQuestionCount] = useState<number | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const navigatingRef = useRef(false);
  const partnerJoinedRef = useRef<
    ((payload: PlayerJoinedPayload) => void) | null
  >(null);

  const navigateToQuiz = useCallback(() => {
    if (!sessionId || navigatingRef.current) return;
    navigatingRef.current = true;
    markLeaving();
    router.replace(`/quiz/${sessionId}`);
  }, [router, sessionId, markLeaving]);

  useEffect(() => {
    if (!sessionId) return;

    let mounted = true;

    async function bootstrap() {
      const stored = await getStoredSession(sessionId);
      if (!mounted) return;

      if (stored) {
        setPlayerId(stored.playerId);
        setRole(stored.role);
        setCategory(stored.category);
        setQuestionCount(stored.questionCount);
        setRoomCode(stored.roomCode ?? null);
        setStatus(stored.role === 'player1' ? 'host' : 'waiting');
        return;
      }

      // Joining is now code-based from the home screen. A deep link to a
      // lobby without a stored session means we don't have a player id yet.
      setStatus('needsCode');
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [sessionId]);

  const {
    status: socketStatus,
    state: gameState,
    refresh,
  } = useGameSocket(sessionId ?? null, playerId, {
    onPartnerJoined: (payload) => partnerJoinedRef.current?.(payload),
  });

  const handlePartnerJoined = useCallback(
    async (_payload: PlayerJoinedPayload) => {
      if (navigatingRef.current || !playerId) return;

      // Rehydrate from REST to confirm; never navigate on the socket event alone.
      await refresh();

      const latest = getLastState();
      const err = getLastError();

      if (err || !latest) {
        setLobbyError({
          kind: 'network',
          message:
            "The other player joined, but we couldn't confirm it. Tap retry.",
          actionLabel: 'RETRY',
        });
        setStatus('error');
        return;
      }

      if (latest.partner.joined) {
        navigateToQuiz();
      }
    },
    [playerId, navigateToQuiz, refresh],
  );

  useEffect(() => {
    partnerJoinedRef.current = handlePartnerJoined;
  }, [handlePartnerJoined]);

  // If we already have a confirmed partner (rejoin, race with socket event),
  // navigate immediately so the lobby is never a dead end.
  useEffect(() => {
    if (!playerId || !gameState) return;
    if (gameState.partner.joined) {
      navigateToQuiz();
    }
  }, [playerId, gameState, navigateToQuiz]);

  // When the socket is offline, poll REST every 5s so a bad connection
  // doesn't strand the player in the lobby.
  useEffect(() => {
    if (!playerId || socketStatus !== 'offline') return;

    const tick = async () => {
      try {
        const state = await getSessionState(sessionId, playerId);
        if (state.partner.joined) navigateToQuiz();
      } catch {
        // Ignore and retry on the next interval.
      }
    };

    tick();
    const intervalId = setInterval(tick, 5000);
    return () => clearInterval(intervalId);
  }, [playerId, socketStatus, sessionId, navigateToQuiz]);

  // Android hardware back / gesture back leaves the lobby cleanly instead of
  // dropping the user into a half-joined state. We use Expo Router's
  // `useNavigation` + `beforeRemove` rather than `BackHandler` directly.
  useInterceptBack(
    useCallback(
      ({ preventDefault }) => {
        if (leavingIntentionallyRef.current) return;
        preventDefault();
        router.replace('/');
      },
      [leavingIntentionallyRef, router],
    ),
  );

  const handleRetry = useCallback(async () => {
    if (!playerId) {
      router.replace('/');
      return;
    }

    setLobbyError(null);
    setStatus(role === 'player1' ? 'host' : 'waiting');

    try {
      const latest = await getSessionState(sessionId, playerId);
      if (latest.partner.joined) {
        navigateToQuiz();
      }
    } catch {
      setLobbyError({
        kind: 'network',
        message: "Still can't reach the server. Keep waiting or try again.",
        actionLabel: 'RETRY',
      });
      setStatus('error');
    }
  }, [playerId, role, sessionId, router, navigateToQuiz]);

  const handleErrorAction = useCallback(() => {
    if (!lobbyError) return;

    if (
      lobbyError.kind === 'notFound' ||
      lobbyError.kind === 'full' ||
      lobbyError.kind === 'completed'
    ) {
      router.replace('/');
    } else {
      void handleRetry();
    }
  }, [lobbyError, router, handleRetry]);

  const connectionLabel = (() => {
    switch (socketStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting…';
      case 'reconnecting':
        return 'Reconnecting…';
      case 'offline':
        return 'Offline — checking every 5s';
    }
  })();

  if (!sessionId) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-6">
          <Text variant="display-md" color="primary">
            Missing game link
          </Text>
          <Button title="START NEW GAME" onPress={() => router.replace('/')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView className="flex-1">
        <View className="flex-grow justify-center px-6 py-8">
          {status === 'loading' && (
            <View className="items-center gap-4">
              <Text variant="display-md" color="primary">
                LOADING GAME…
              </Text>
              <Text variant="body" color="secondary" className="text-center">
                Fetching your session.
              </Text>
            </View>
          )}

          {status === 'needsCode' && (
            <View className="items-center gap-6">
              <Text
                variant="display-md"
                color="primary"
                className="text-center"
              >
                ENTER CODE ON HOME SCREEN
              </Text>
              <Text variant="body" color="secondary" className="text-center">
                Joining a game now requires a 6-character room code.
              </Text>
              <Button title="GO HOME" onPress={() => router.replace('/')} />
            </View>
          )}

          {status === 'error' && lobbyError && (
            <View className="items-center gap-6">
              <Text variant="display-xl" color="primary">
                X_X
              </Text>
              <Text
                variant="display-md"
                color="primary"
                className="text-center"
              >
                {lobbyError.message}
              </Text>
              <Button
                title={lobbyError.actionLabel}
                onPress={handleErrorAction}
              />
            </View>
          )}

          {(status === 'host' || status === 'waiting') && (
            <>
              <View className="mb-8 items-center gap-3">
                <View className="border-2 border-border-color bg-bg-card px-3 py-1">
                  <Text variant="body-sm" bold color="primary">
                    MODE: {category ? formatCategory(category) : '…'}
                  </Text>
                </View>

                <Text
                  variant="display-lg"
                  color="primary"
                  className="text-center"
                >
                  {status === 'host' ? 'WAITING FOR P2…' : 'PLAYER 2 READY'}
                </Text>

                <Text variant="body" color="secondary" className="text-center">
                  {status === 'host'
                    ? `${questionCount} STAGES · SHARE CODE TO CO-OP`
                    : 'Waiting for the host to start…'}
                </Text>
              </View>

              {status === 'host' && (
                <Card shadowSize="md" className="mb-8">
                  <View className="gap-4">
                    <Text variant="body-sm" bold color="primary">
                      ROOM CODE
                    </Text>
                    <View className="border-2 border-border-color bg-bg-secondary p-3">
                      <Text
                        variant="display-md"
                        color="primary"
                        selectable
                        className="text-center tracking-widest"
                      >
                        {roomCode ?? '…'}
                      </Text>
                    </View>
                    <Text
                      variant="body-sm"
                      color="secondary"
                      className="text-center"
                    >
                      Share this code with Player 2.
                    </Text>
                  </View>
                </Card>
              )}

              <View className="items-center gap-3">
                <View className="h-3 w-3 rounded-full bg-accent" />
                <Text variant="body-sm" color="muted">
                  {connectionLabel}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

export default function LobbyRoute() {
  return (
    <ErrorBoundary context={{ route: 'lobby' }}>
      <LobbyScreen />
    </ErrorBoundary>
  );
}
