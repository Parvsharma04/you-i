import { View } from 'react-native';

import { useConnectivity } from '@/hooks/useConnectivity';

/**
 * App-level reconnect indicator. It overlays the screen so reconnecting never
 * shifts or blocks the content below it.
 */
export function ConnectivityBanner() {
  const connectivity = useConnectivity();

  if (connectivity.kind === 'online') {
    return null;
  }

  const isNoInternet = connectivity.kind === 'noInternet';

  return (
    <View
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLabel={
        isNoInternet
          ? 'No internet connection. Check your network settings.'
          : 'Server unreachable. Retrying.'
      }
      className={`absolute left-0 right-0 top-0 z-50 h-1 ${isNoInternet ? 'bg-accent' : 'bg-text-muted'}`}
    />
  );
}
