import '../../global.css';

import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as RouterThemeProvider,
} from 'expo-router';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { CATEGORIES } from '@youandi/shared';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ConnectivityBanner } from '@/components/connectivity-banner';
import { ErrorBoundary } from '@/components/error-boundary';
import { PrivacyOverlay } from '@/components/privacy-overlay';
import { useAppFonts } from '@/lib/fonts';
import { ThemeProvider } from '@/theme';

// Smoke test: confirms @youandi/shared resolves correctly through the
// pnpm workspace + Metro config. Safe no-op in production.
if (__DEV__) {
  console.log(`[@youandi/shared] categories: ${CATEGORIES.join(', ')}`);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { fontsLoaded, fontError } = useAppFonts();

  // Keep the native splash screen up until every static app font is ready.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <RouterThemeProvider
      value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
    >
      <ThemeProvider>
        <AnimatedSplashOverlay />
        <PrivacyOverlay />
        <ConnectivityBanner />
        <KeyboardProvider>
          <ErrorBoundary context={{ route: 'root' }}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'default',
                gestureEnabled: true,
              }}
            />
          </ErrorBoundary>
        </KeyboardProvider>
      </ThemeProvider>
    </RouterThemeProvider>
  );
}
