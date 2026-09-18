import '../../global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { CATEGORIES } from '@youandi/shared';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ConnectivityBanner } from '@/components/connectivity-banner';
import { useAppFonts } from '@/lib/fonts';

// Smoke test: confirms @youandi/shared resolves correctly through the
// pnpm workspace + Metro config. Safe no-op in production.
if (__DEV__) {
  console.log(`[@youandi/shared] categories: ${CATEGORIES.join(', ')}`);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { fontsLoaded, fontError } = useAppFonts();

  // Keep the native splash screen up until VT323/Space Mono are ready, so
  // the retro type never flashes in with a fallback system font.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <ConnectivityBanner />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
