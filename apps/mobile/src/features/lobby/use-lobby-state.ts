import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { type Category, type PlayerJoinedPayload } from '@youandi/shared';

import { useGameSocket } from '@/hooks/useGameSocket';
import {
  useInterceptBack,
  useLeavingIntentionally,
} from '@/hooks/useInterceptBack';
import { getSession, getSessionState } from '@/lib/api';
import { getLastError, getLastState } from '@/lib/socket';
import { getSession as getStoredSession } from '@/lib/storage';

type LobbyStatus = 'loading' | 'host' | 'waiting' | 'error' | 'needsCode';

type ErrorKind = 'notFound' | 'full' | 'completed' | 'network' | 'unknown';

export type LobbyError = {
  kind: ErrorKind;
  message: string;
  actionLabel: string;
};

export function useLobbyState(sessionId: string | undefined) {
  const router = useRouter();
  const { leavingIntentionallyRef, markLeaving } = useLeavingIntentionally();

  const [status, setStatus] = useState<LobbyStatus>('loading');
  const [lobbyError, setLobbyError] = useState<LobbyError | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [role, setRole] = useState<'player1' | 'player2' | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [questionCount, setQuestionCount] = useState<number | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<string | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
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

  const loadSessionDetails = useCallback(async () => {
    if (!sessionId) return;
    try {
      const session = await getSession(sessionId);
      if (session.code) setRoomCode(session.code);
      if (session.codeExpiresAt) setCodeExpiresAt(session.codeExpiresAt);
    } catch {
      // Non-fatal: the stored code is still usable.
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const activeSessionId = sessionId;

    let mounted = true;

    async function bootstrap() {
      const stored = await getStoredSession(activeSessionId);
      if (!mounted) return;

      if (stored) {
        setPlayerId(stored.playerId);
        setRole(stored.role);
        setCategory(stored.category);
        setQuestionCount(stored.questionCount);
        setRoomCode(stored.roomCode ?? null);
        setStatus(stored.role === 'player1' ? 'host' : 'waiting');
        if (stored.role === 'player1') {
          await loadSessionDetails();
        }
        return;
      }

      setStatus('needsCode');
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, [sessionId, loadSessionDetails]);

  useEffect(() => {
    if (!codeExpiresAt) return;

    const tick = () => {
      const remaining = new Date(codeExpiresAt).getTime() - Date.now();
      setTimeLeftMs(remaining);
    };

    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [codeExpiresAt]);

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

  useEffect(() => {
    if (!playerId || !gameState) return;
    if (gameState.partner.joined) {
      navigateToQuiz();
    }
  }, [playerId, gameState, navigateToQuiz]);

  useEffect(() => {
    if (!playerId || socketStatus !== 'offline' || !sessionId) return;

    const tick = async () => {
      try {
        const state = await getSessionState(sessionId, playerId);
        if (state.partner.joined) navigateToQuiz();
      } catch {
        // Ignore and retry on the next interval.
      }
    };

    void tick();
    const intervalId = setInterval(tick, 5000);
    return () => clearInterval(intervalId);
  }, [playerId, socketStatus, sessionId, navigateToQuiz]);

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
      const latest = await getSessionState(sessionId!, playerId);
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

  return {
    status,
    setStatus,
    lobbyError,
    setLobbyError,
    playerId,
    role,
    category,
    questionCount,
    roomCode,
    setRoomCode,
    codeExpiresAt,
    setCodeExpiresAt,
    timeLeftMs,
    connectionLabel,
    handleErrorAction,
    handleRetry,
    navigateToQuiz,
  };
}
