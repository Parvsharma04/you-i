import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView, Share, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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
  ApiError,
  NetworkError,
  TimeoutError,
  getSession as getSessionApi,
  getSessionState,
  joinSession,
} from '@/lib/api';
import { env } from '@/lib/env';
import { getLastError, getLastState } from '@/lib/socket';
import {
  getSession as getStoredSession,
  saveSession,
  type SessionRecord,
} from '@/lib/storage';

type LobbyStatus = 'loading' | 'joining' | 'host' | 'waiting' | 'error';

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

function buildShareLink(sessionId: string): string {
  const base = env.webUrl.replace(/\/$/, '');
  return `${base}/lobby/${sessionId}`;
}

function LobbyScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams<{ sessionId: string }>();
  const sessionId = Array.isArray(rawParams.sessionId)
    ? rawParams.sessionId[0]
    : rawParams.sessionId;

  const [status, setStatus] = useState<LobbyStatus>('loading');
  const [lobbyError, setLobbyError] = useState<LobbyError | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [role, setRole] = useState<'player1' | 'player2' | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [questionCount, setQuestionCount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const navigatingRef = useRef(false);
  const partnerJoinedRef = useRef<
    ((payload: PlayerJoinedPayload) => void) | null
  >(null);

  const navigateToQuiz = useCallback(() => {
    if (!sessionId || navigatingRef.current) return;
    navigatingRef.current = true;
    router.replace(`/quiz/${sessionId}`);
  }, [router, sessionId]);

  const joinAsGuest = useCallback(async () => {
    if (!sessionId) return;

    setStatus('joining');
    setLobbyError(null);

    try {
      const session = await getSessionApi(sessionId);

      if (session.status === SESSION_STATUSES.COMPLETED) {
        setLobbyError({
          kind: 'completed',
          message: 'This game has already finished.',
          actionLabel: 'START NEW GAME',
        });
        setStatus('error');
        return;
      }

      if (session.player2Id) {
        setLobbyError({
          kind: 'full',
          message: 'This game already has two players.',
          actionLabel: 'START NEW GAME',
        });
        setStatus('error');
        return;
      }

      const joined = await joinSession({ sessionId });

      const record: SessionRecord = {
        sessionId,
        playerId: joined.player2Id,
        role: 'player2',
        category: joined.category,
        questionCount: joined.questionCount,
        savedAt: new Date().toISOString(),
      };
      await saveSession(record);

      setPlayerId(joined.player2Id);
      setRole('player2');
      setCategory(joined.category);
      setQuestionCount(joined.questionCount);
      setStatus('waiting');
    } catch (err) {
      if (err instanceof NetworkError || err instanceof TimeoutError) {
        setLobbyError({
          kind: 'network',
          message: "You're offline. Check your connection and try again.",
          actionLabel: 'TRY AGAIN',
        });
      } else if (err instanceof ApiError) {
        if (err.status === 404) {
          setLobbyError({
            kind: 'notFound',
            message: 'Game not found. It may have expired.',
            actionLabel: 'START NEW GAME',
          });
        } else if (
          err.status === 400 &&
          err.message.toLowerCase().includes('already full')
        ) {
          setLobbyError({
            kind: 'full',
            message: 'This game already has two players.',
            actionLabel: 'START NEW GAME',
          });
        } else {
          setLobbyError({
            kind: 'unknown',
            message: err.message,
            actionLabel: 'TRY AGAIN',
          });
        }
      } else {
        setLobbyError({
          kind: 'unknown',
          message: 'Could not join this game.',
          actionLabel: 'TRY AGAIN',
        });
      }
      setStatus('error');
    }
  }, [sessionId]);

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
        setStatus(stored.role === 'player1' ? 'host' : 'waiting');
        return;
      }

      await joinAsGuest();
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [sessionId, joinAsGuest]);

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

  // Android hardware back leaves the lobby cleanly instead of dropping the
  // user into a half-joined state.
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.replace('/');
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      return () => subscription.remove();
    }, [router]),
  );

  const handleCopy = useCallback(async () => {
    if (!sessionId) return;
    await Clipboard.setStringAsync(buildShareLink(sessionId));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sessionId]);

  const handleShare = useCallback(() => {
    if (!sessionId) return;
    const url = buildShareLink(sessionId);
    void Share.share({ message: `PLAYER 2 PRESS START:\n\n${url}` });
  }, [sessionId]);

  const handleRetry = useCallback(async () => {
    if (!playerId) {
      await joinAsGuest();
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
  }, [playerId, role, sessionId, joinAsGuest, navigateToQuiz]);

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
                LOADING…
              </Text>
            </View>
          )}

          {status === 'joining' && (
            <View className="items-center gap-4">
              <Text variant="display-md" color="primary">
                JOINING GAME…
              </Text>
              <Text variant="body" color="secondary">
                Hold on while we grab your controller.
              </Text>
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
                    ? `${questionCount} STAGES · SHARE LINK TO CO-OP`
                    : 'Waiting for the host to start…'}
                </Text>
              </View>

              {status === 'host' && (
                <Card shadowSize="md" className="mb-8">
                  <View className="gap-4">
                    <Text variant="body-sm" bold color="primary">
                      INVITE LINK
                    </Text>
                    <View className="border-2 border-border-color bg-bg-secondary p-3">
                      <Text
                        variant="body-sm"
                        color="primary"
                        selectable
                        numberOfLines={2}
                      >
                        {buildShareLink(sessionId)}
                      </Text>
                    </View>
                    <View className="flex-row gap-3">
                      <View className="flex-1">
                        <Button
                          title={copied ? 'COPIED!' : 'COPY'}
                          onPress={handleCopy}
                        />
                      </View>
                      <View className="flex-1">
                        <Button title="SHARE" onPress={handleShare} />
                      </View>
                    </View>
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
