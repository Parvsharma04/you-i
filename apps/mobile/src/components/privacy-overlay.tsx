import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus, View } from 'react-native';

/**
 * Hides the current screen from the iOS app-switcher snapshot and the
 * Android recents thumbnail whenever the app is backgrounded. Player IDs,
 * answers, and result details should never be visible in the switcher.
 */
export function PrivacyOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(AppState.currentState !== 'active');

    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      setVisible(next !== 'active');
    });

    return () => subscription.remove();
  }, []);

  if (!visible) return null;

  return (
    <View
      accessibilityRole="none"
      accessibilityLabel="App is in the background"
      className="absolute inset-0 z-[9999] bg-bg-primary"
      pointerEvents="none"
    />
  );
}
