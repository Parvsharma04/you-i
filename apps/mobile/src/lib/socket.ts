import type {
  AnswerSubmittedPayload,
  PlayerCompletePayload,
  PlayerJoinedPayload,
  ResultsReadyPayload,
} from '@youandi/shared';

import { maskPlayerId } from './mask-player-id';
import { socket } from './socket-instance';
import * as lifecycle from './socket-lifecycle';
import * as state from './socket-state';

export type {
  SocketEventLogEntry,
  SocketEventName,
  SocketStatus,
} from './socket-state';

socket.on('connect', () => {
  state.setConnectionAttemptPending(false);
  state.setReconnectAttemptActive(false);
  state.logEvent('connect');
  lifecycle.updateStatus();
  lifecycle.joinRoomIfConnected();
  lifecycle.rehydrate();
});

socket.on('connect_error', (error) => {
  state.logEvent('connect_error', error.message);
  lifecycle.updateStatus();
});

socket.on('disconnect', (reason) => {
  state.setConnectionAttemptPending(false);
  state.setReconnectAttemptActive(false);
  state.logEvent('disconnect', reason);
  lifecycle.updateStatus();
});

socket.io.on('reconnect_attempt', (attempt) => {
  state.setReconnectAttemptActive(true);
  state.logEvent('reconnect_attempt', attempt);
  lifecycle.updateStatus();
});

socket.io.on('reconnect', (attempt) => {
  state.setReconnectAttemptActive(false);
  state.setConnectionAttemptPending(false);
  state.logEvent('reconnect', attempt);
  lifecycle.updateStatus();
});

socket.io.on('reconnect_error', (error) => {
  state.logEvent('reconnect_error', error.message);
  lifecycle.updateStatus();
});

socket.io.on('reconnect_failed', () => {
  state.setReconnectAttemptActive(false);
  state.setConnectionAttemptPending(false);
  state.logEvent('reconnect_failed');
  lifecycle.updateStatus();
});

socket.on('playerJoined', (payload: PlayerJoinedPayload) => {
  state.logEvent('playerJoined', { playerId: maskPlayerId(payload.playerId) });
});

socket.on('answerSubmitted', (payload: AnswerSubmittedPayload) => {
  state.logEvent('answerSubmitted', {
    ...payload,
    playerId: maskPlayerId(payload.playerId),
  });
});

socket.on('playerComplete', (payload: PlayerCompletePayload) => {
  state.logEvent('playerComplete', {
    playerId: maskPlayerId(payload.playerId),
  });
});

socket.on('resultsReady', (payload: ResultsReadyPayload) => {
  state.logEvent('resultsReady', payload);
});

export const acquireSocketLifecycle = lifecycle.acquireSocketLifecycle;
export const setSocketCredentials = lifecycle.setSocketCredentials;
export const clearSocketCredentials = lifecycle.clearSocketCredentials;
export const forceDisconnect = lifecycle.forceDisconnect;
export const forceBackground = lifecycle.forceBackground;
export const clearForcedBackground = lifecycle.clearForcedBackground;
export const refreshState = lifecycle.refreshState;
export const emitSubmitAnswer = lifecycle.emitSubmitAnswer;
export const emitQuizComplete = lifecycle.emitQuizComplete;

export const getSocketCredentials = state.getCredentials;
export const getSocketStatus = state.getStatus;
export const getLastState = state.getLastState;
export const getLastError = state.getLastError;
export const getRecentEvents = state.getRecentEvents;
export const subscribeToState = state.subscribeToState;
export const subscribeToStatus = state.subscribeToStatus;
export const subscribeToErrors = state.subscribeToErrors;
export const subscribeToEvents = state.subscribeToEvents;
export const isForcedBackground = state.getForcedBackground;
