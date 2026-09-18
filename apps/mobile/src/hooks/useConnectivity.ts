import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

import { getSocketStatus, subscribeToStatus, type SocketStatus } from '@/lib/socket';

export type ConnectivityState =
  | { kind: 'online' }
  | { kind: 'noInternet' }
  | { kind: 'serverUnreachable' };

const SERVER_UNREACHABLE_DELAY_MS = 5_000;

/**
 * Combines expo-network (device-level internet reachability) with the
 * game socket's connection status so the UI can tell the user whether
 * the problem is on their end (no internet) or ours (server unreachable).
 */
export function useConnectivity(): ConnectivityState {
  const [networkReachable, setNetworkReachable] = useState<boolean | null>(null);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>(getSocketStatus());
  const [offlineSince, setOfflineSince] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const state = await Network.getNetworkStateAsync();
      if (!mounted) return;
      setNetworkReachable(state.isInternetReachable ?? null);
    }

    bootstrap();

    const unsubNetwork = Network.addNetworkStateListener((state) => {
      if (!mounted) return;
      setNetworkReachable(state.isInternetReachable ?? null);
    });

    const unsubSocket = subscribeToStatus((status) => {
      if (!mounted) return;
      setSocketStatus(status);
    });

    return () => {
      mounted = false;
      unsubNetwork.remove();
      unsubSocket();
    };
  }, []);

  useEffect(() => {
    const isSocketOffline = socketStatus === 'offline' || socketStatus === 'reconnecting';

    if (!isSocketOffline) {
      setOfflineSince(null);
      return;
    }

    if (offlineSince === null) {
      setOfflineSince(Date.now());
    }
  }, [socketStatus, offlineSince]);

  if (networkReachable === false) {
    return { kind: 'noInternet' };
  }

  const isSocketOffline = socketStatus === 'offline' || socketStatus === 'reconnecting';
  const serverUnreachableForAWhile =
    isSocketOffline && offlineSince !== null && Date.now() - offlineSince >= SERVER_UNREACHABLE_DELAY_MS;

  if (networkReachable === true && serverUnreachableForAWhile) {
    return { kind: 'serverUnreachable' };
  }

  return { kind: 'online' };
}
