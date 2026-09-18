import { useCallback, useEffect, useState } from 'react';

import type {
  AnswerSubmittedPayload,
  PlayerCompletePayload,
  PlayerJoinedPayload,
  ResultsReadyPayload,
} from '@youandi/shared';

import type { SessionStateResponse } from '@youandi/shared';
import {
  acquireSocketLifecycle,
  clearForcedBackground,
  emitQuizComplete,
  emitSubmitAnswer,
  forceBackground as forceBackgroundSocket,
  forceDisconnect,
  getLastError,
  getLastState,
  getRecentEvents,
  getSocketStatus,
  isForcedBackground,
  refreshState,
  subscribeToErrors,
  subscribeToEvents,
  subscribeToState,
  subscribeToStatus,
  type SocketEventLogEntry,
  type SocketStatus,
} from '@/lib/socket';

import { useLatest } from './useLatest';

export type GameSocketOptions = {
  onPartnerJoined?: (payload: PlayerJoinedPayload) => void;
  onAnswerSubmitted?: (payload: AnswerSubmittedPayload) => void;
  onPlayerComplete?: (payload: PlayerCompletePayload) => void;
  onResultsReady?: (payload: ResultsReadyPayload) => void;
};

export type GameSocketResult = {
  status: SocketStatus;
  state: SessionStateResponse | null;
  error: Error | null;
  events: SocketEventLogEntry[];
  forcedBackground: boolean;
  refresh: () => Promise<void>;
  emitAnswer: (questionId: number, answerIndex: number) => void;
  emitComplete: () => void;
  forceDisconnect: () => void;
  forceBackground: () => void;
};

/**
 * React hook around the module-level game socket. Survives backgrounding:
 * the socket is kept for a short grace period, then disconnected, and
 * reconnected on foreground. Every (re)connect re-joins the room and
 * rehydrates state from REST so the UI never relies on missed events.
 */
export function useGameSocket(
  sessionId: string | null,
  playerId: string | null,
  options: GameSocketOptions = {},
): GameSocketResult {
  const [status, setStatus] = useState<SocketStatus>(getSocketStatus());
  const [state, setState] = useState<SessionStateResponse | null>(
    getLastState(),
  );
  const [error, setError] = useState<Error | null>(getLastError());
  const [events, setEvents] =
    useState<SocketEventLogEntry[]>(getRecentEvents());
  const [forcedBackground, setForcedBackground] =
    useState(isForcedBackground());
  const optionsRef = useLatest(options);

  useEffect(() => {
    if (!sessionId || !playerId) return;

    const cleanupLifecycle = acquireSocketLifecycle(sessionId, playerId);
    const unsubStatus = subscribeToStatus(setStatus);
    const unsubState = subscribeToState(setState);
    const unsubError = subscribeToErrors(setError);
    const unsubEvents = subscribeToEvents((entry) => {
      setEvents(getRecentEvents());
      setForcedBackground(isForcedBackground());

      switch (entry.name) {
        case 'playerJoined':
          optionsRef.current.onPartnerJoined?.(
            entry.payload as PlayerJoinedPayload,
          );
          refreshState();
          break;
        case 'answerSubmitted':
          optionsRef.current.onAnswerSubmitted?.(
            entry.payload as AnswerSubmittedPayload,
          );
          refreshState();
          break;
        case 'playerComplete':
          optionsRef.current.onPlayerComplete?.(
            entry.payload as PlayerCompletePayload,
          );
          refreshState();
          break;
        case 'resultsReady':
          optionsRef.current.onResultsReady?.(
            entry.payload as ResultsReadyPayload,
          );
          refreshState();
          break;
      }
    });

    return () => {
      unsubStatus();
      unsubState();
      unsubError();
      unsubEvents();
      cleanupLifecycle();
    };
  }, [sessionId, playerId, optionsRef]);

  const emitAnswer = useCallback(
    (questionId: number, answerIndex: number) => {
      if (!sessionId || !playerId) return;
      emitSubmitAnswer({ sessionId, playerId, questionId, answerIndex });
    },
    [sessionId, playerId],
  );

  const emitComplete = useCallback(() => {
    if (!sessionId || !playerId) return;
    emitQuizComplete({ sessionId, playerId });
  }, [sessionId, playerId]);

  const handleForceDisconnect = useCallback(() => {
    forceDisconnect();
    setForcedBackground(isForcedBackground());
  }, []);

  const handleForceBackground = useCallback(() => {
    if (isForcedBackground()) {
      clearForcedBackground();
    } else {
      forceBackgroundSocket();
    }
    setForcedBackground(isForcedBackground());
  }, []);

  return {
    status,
    state,
    error,
    events,
    forcedBackground,
    refresh: refreshState,
    emitAnswer,
    emitComplete,
    forceDisconnect: handleForceDisconnect,
    forceBackground: handleForceBackground,
  };
}
