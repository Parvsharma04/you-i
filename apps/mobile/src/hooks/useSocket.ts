import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import Constants from 'expo-constants';
import { io, Socket } from 'socket.io-client';

export interface UseSocketResult {
  socket: Socket | null;
  connected: boolean;
}

/**
 * Mobile-optimized Socket.IO hook.
 *
 * Mobile optimizations:
 * 1. Transports: starts with WebSocket and falls back to polling on restrictive networks.
 * 2. Reconnection: configured with exponential backoff (1s - 5s, max 10 attempts)
 *    to prevent aggressive battery and radio drain while offline.
 * 3. AppState Handling: re-establishes socket connection when returning to foreground
 *    after OS sleep/background socket drops.
 * 4. Timeout: relaxed to 20s to account for mobile latency and cell tower handovers.
 * 5. Error logging: captures `connect_error` events for diagnostic visibility.
 * 6. Clean lifecycle: removes AppState subscription and explicitly disconnects on unmount.
 */
export function useSocket(
  sessionId: string,
  onConnect?: () => void,
): UseSocketResult {
  const socketRef = useRef<Socket | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const onConnectRef = useRef(onConnect);
  onConnectRef.current = onConnect;

  const [connected, setConnected] = useState<boolean>(false);

  useEffect(() => {
    // Support both extra.API_URL and extra.apiUrl from app.config.ts / EAS config
    const extra = Constants.expoConfig?.extra;
    const apiUrl = (extra?.API_URL ?? extra?.apiUrl ?? extra?.wsUrl) as
      | string
      | undefined;

    if (!apiUrl || !sessionId) return;

    // Socket config with mobile optimizations
    const socket: Socket = io(apiUrl, {
      transports: ['websocket', 'polling'], // Fallback to polling for restricted mobile/carrier firewalls
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 20000, // Mobile-friendly timeout for high-latency handovers
      autoConnect: true,
      query: { sessionId },
      upgrade: false, // Don't upgrade from polling to websocket mid-session
      path: '/socket.io/',
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected');
      setConnected(true);
      onConnectRef.current?.();
    });

    socket.on('connect_error', (error: Error) => {
      console.warn('[Socket] Connection error:', error);
      setConnected(false);
    });

    socket.on('disconnect', (reason: Socket.DisconnectReason) => {
      console.log('[Socket] Disconnected:', reason);
      setConnected(false);
      if (reason === 'io server disconnect') {
        // Explicitly disconnected by server: manually reconnect
        socket.connect();
      }
    });

    socketRef.current = socket;

    // Handle app backgrounding / foreground resumption
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active' && appStateRef.current !== 'active') {
          if (!socket.connected) {
            console.log('[Socket] Foregrounded, reconnecting...');
            socket.connect();
          }
        }
        appStateRef.current = nextState;
      },
    );

    return () => {
      subscription.remove();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [sessionId]);

  return {
    socket: socketRef.current,
    connected,
  };
}
