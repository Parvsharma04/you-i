import { AppState, type AppStateStatus } from 'react-native';

import type {
  QuizCompletePayload,
  SubmitAnswerSocketPayload,
} from '@youandi/shared';

import { getSessionState } from './api';
import { socket } from './socket-instance';
import * as state from './socket-state';

const BACKGROUND_GRACE_MS = 3_000;

let backgroundTimer: ReturnType<typeof setTimeout> | null = null;
let appStateMonitoring = false;
let appStateRefCount = 0;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null =
  null;
let activeConsumerCount = 0;
let rehydratePromise: Promise<void> | null = null;

function clearBackgroundTimer(): void {
  if (backgroundTimer) {
    clearTimeout(backgroundTimer);
    backgroundTimer = null;
  }
}

function shouldBeConnected(): boolean {
  const credentials = state.getCredentials();
  return (
    !!credentials && state.getAppStateActive() && !state.getForcedBackground()
  );
}

function computeStatus(): state.SocketStatus {
  if (socket.connected) return 'connected';
  if (state.getReconnectAttemptActive()) return 'reconnecting';
  if (state.getConnectionAttemptPending()) return 'connecting';
  return 'offline';
}

export function updateStatus(): void {
  state.setStatus(computeStatus());
}

function connect(): void {
  if (!shouldBeConnected()) return;
  if (socket.connected || state.getConnectionAttemptPending()) return;

  state.setConnectionAttemptPending(true);
  updateStatus();
  socket.connect();
}

function disconnect(): void {
  clearBackgroundTimer();
  socket.disconnect();
  state.setConnectionAttemptPending(false);
  state.setReconnectAttemptActive(false);
  updateStatus();
}

export function joinRoomIfConnected(): void {
  const credentials = state.getCredentials();
  if (!credentials || !socket.connected) return;
  socket.emit('joinRoom', credentials);
}

export async function rehydrate(): Promise<void> {
  const credentials = state.getCredentials();
  if (!credentials) return;

  // Deduplicate concurrent rehydrates so a reconnect + manual refresh +
  // foreground event don't trigger a fetch storm.
  if (rehydratePromise) return rehydratePromise;

  rehydratePromise = (async () => {
    try {
      const nextState = await getSessionState(
        credentials.sessionId,
        credentials.playerId,
      );
      state.setLastState(nextState);
      state.setLastError(null);
      state.notifyStateSubscribers(nextState);
    } catch (error) {
      const normalized =
        error instanceof Error ? error : new Error(String(error));
      state.setLastError(normalized);
      state.notifyErrorSubscribers(normalized);
    } finally {
      rehydratePromise = null;
    }
  })();

  return rehydratePromise;
}

function handleAppStateChange(next: AppStateStatus): void {
  const isActive = next === 'active';
  state.setAppStateActive(isActive);

  if (isActive) {
    clearBackgroundTimer();
    state.setForcedBackground(false);
    connect();
    return;
  }

  backgroundTimer = setTimeout(() => {
    if (!state.getAppStateActive()) {
      disconnect();
    }
  }, BACKGROUND_GRACE_MS);
}

function startAppStateMonitoring(): () => void {
  appStateRefCount++;

  if (!appStateMonitoring) {
    appStateMonitoring = true;
    state.setAppStateActive(AppState.currentState === 'active');
    appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
  }

  return () => {
    appStateRefCount--;
    if (appStateRefCount === 0 && appStateSubscription) {
      appStateSubscription.remove();
      appStateSubscription = null;
      appStateMonitoring = false;
      clearBackgroundTimer();
    }
  };
}

export function acquireSocketLifecycle(
  sessionId: string,
  playerId: string,
): () => void {
  activeConsumerCount++;
  setSocketCredentials(sessionId, playerId);
  const cleanupAppState = startAppStateMonitoring();

  return () => {
    cleanupAppState();
    activeConsumerCount--;
    if (activeConsumerCount === 0) {
      disconnect();
    }
  };
}

export function setSocketCredentials(
  sessionId: string,
  playerId: string,
): void {
  state.setCredentials({ sessionId, playerId });

  if (socket.connected) {
    joinRoomIfConnected();
    rehydrate();
  } else {
    connect();
  }
}

export function clearSocketCredentials(): void {
  state.setCredentials(null);
  disconnect();
}

export function forceDisconnect(): void {
  disconnect();
}

export function forceBackground(): void {
  state.setForcedBackground(true);
  disconnect();
}

export function clearForcedBackground(): void {
  state.setForcedBackground(false);
  if (state.getAppStateActive()) {
    connect();
  }
}

export function refreshState(): Promise<void> {
  return rehydrate();
}

export function emitSubmitAnswer(payload: SubmitAnswerSocketPayload): void {
  if (socket.connected) {
    socket.emit('submitAnswer', payload);
  }
}

export function emitQuizComplete(payload: QuizCompletePayload): void {
  if (socket.connected) {
    socket.emit('quizComplete', payload);
  }
}
