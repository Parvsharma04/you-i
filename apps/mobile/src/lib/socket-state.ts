import type { SessionStateResponse } from '@youandi/shared';

export type SocketStatus =
  'connecting' | 'connected' | 'reconnecting' | 'offline';

export type SocketEventName =
  | 'connect'
  | 'connect_error'
  | 'disconnect'
  | 'reconnect'
  | 'reconnect_attempt'
  | 'reconnect_error'
  | 'reconnect_failed'
  | 'playerJoined'
  | 'answerSubmitted'
  | 'playerComplete'
  | 'resultsReady';

export type SocketEventLogEntry = {
  id: string;
  timestamp: number;
  name: SocketEventName;
  payload: unknown;
};

type Credentials = {
  sessionId: string;
  playerId: string;
};

type StateSubscriber = (state: SessionStateResponse) => void;
type StatusSubscriber = (status: SocketStatus) => void;
type ErrorSubscriber = (error: Error) => void;
type EventSubscriber = (entry: SocketEventLogEntry) => void;

const MAX_EVENT_LOG_SIZE = 10;

let credentials: Credentials | null = null;
let currentStatus: SocketStatus = 'offline';
let lastState: SessionStateResponse | null = null;
let lastError: Error | null = null;
let reconnectAttemptActive = false;
let connectionAttemptPending = false;
let forcedBackground = false;
let appStateActive = true;

const stateSubscribers = new Set<StateSubscriber>();
const statusSubscribers = new Set<StatusSubscriber>();
const errorSubscribers = new Set<ErrorSubscriber>();
const eventSubscribers = new Set<EventSubscriber>();

let eventLog: SocketEventLogEntry[] = [];

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getCredentials(): Credentials | null {
  return credentials;
}

export function setCredentials(next: Credentials | null): void {
  credentials = next;
}

export function getStatus(): SocketStatus {
  return currentStatus;
}

export function setStatus(next: SocketStatus): void {
  if (next === currentStatus) return;
  currentStatus = next;
  statusSubscribers.forEach((cb) => cb(next));
}

export function getLastState(): SessionStateResponse | null {
  return lastState;
}

export function setLastState(next: SessionStateResponse | null): void {
  lastState = next;
}

export function getLastError(): Error | null {
  return lastError;
}

export function setLastError(next: Error | null): void {
  lastError = next;
}

export function getReconnectAttemptActive(): boolean {
  return reconnectAttemptActive;
}

export function setReconnectAttemptActive(value: boolean): void {
  reconnectAttemptActive = value;
}

export function getConnectionAttemptPending(): boolean {
  return connectionAttemptPending;
}

export function setConnectionAttemptPending(value: boolean): void {
  connectionAttemptPending = value;
}

export function getForcedBackground(): boolean {
  return forcedBackground;
}

export function setForcedBackground(value: boolean): void {
  forcedBackground = value;
}

export function getAppStateActive(): boolean {
  return appStateActive;
}

export function setAppStateActive(value: boolean): void {
  appStateActive = value;
}

export function subscribeToState(callback: StateSubscriber): () => void {
  stateSubscribers.add(callback);
  return () => stateSubscribers.delete(callback);
}

export function subscribeToStatus(callback: StatusSubscriber): () => void {
  statusSubscribers.add(callback);
  return () => statusSubscribers.delete(callback);
}

export function subscribeToErrors(callback: ErrorSubscriber): () => void {
  errorSubscribers.add(callback);
  return () => errorSubscribers.delete(callback);
}

export function subscribeToEvents(callback: EventSubscriber): () => void {
  eventSubscribers.add(callback);
  return () => eventSubscribers.delete(callback);
}

export function logEvent(
  name: SocketEventName,
  payload: unknown = undefined,
): SocketEventLogEntry {
  const entry: SocketEventLogEntry = {
    id: generateId(),
    timestamp: Date.now(),
    name,
    payload,
  };
  eventLog = [...eventLog.slice(-(MAX_EVENT_LOG_SIZE - 1)), entry];
  eventSubscribers.forEach((cb) => cb(entry));
  return entry;
}

export function getRecentEvents(): SocketEventLogEntry[] {
  return [...eventLog];
}

export function notifyStateSubscribers(state: SessionStateResponse): void {
  stateSubscribers.forEach((cb) => cb(state));
}

export function notifyErrorSubscribers(error: Error): void {
  errorSubscribers.forEach((cb) => cb(error));
}
