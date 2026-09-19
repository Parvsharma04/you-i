import { SafeAreaView } from 'react-native-safe-area-context';

import { useConnectivity } from '@/hooks/useConnectivity';

import { Text } from './ui/text';

/**
 * App-level banner that distinguishes "no internet" from "server unreachable".
 * Sticks to the top safe area and sits above every screen.
 */
export function ConnectivityBanner() {
  const connectivity = useConnectivity();

  if (connectivity.kind === 'online') {
    return null;
  }

  const isNoInternet = connectivity.kind === 'noInternet';

  return (
    <SafeAreaView
      edges={['top']}
      accessibilityRole="alert"
      accessibilityLabel={
        isNoInternet
          ? 'No internet connection. Check your network settings.'
          : 'Server unreachable. We are working on it.'
      }
      className={`items-center justify-center px-4 py-2 ${isNoInternet ? 'bg-accent' : 'bg-text-muted'}`}
    >
      <Text
        variant="body-sm"
        bold
        color="white"
        className="text-center uppercase tracking-widest"
      >
        {isNoInternet
          ? 'NO INTERNET — CHECK CONNECTION'
          : 'SERVER UNREACHABLE — RETRYING'}
      </Text>
    </SafeAreaView>
  );
}
