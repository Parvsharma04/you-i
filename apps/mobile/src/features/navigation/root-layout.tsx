import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/features/navigation/app-tabs';
import { useAppFonts } from '@/lib/fonts';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { fontsLoaded, fontError } = useAppFonts();

  // Keep the native splash screen up (preventAutoHideAsync above) until
  // VT323/Space Mono are ready, so the retro type never flashes in with a
  // fallback system font. AnimatedSplashOverlay only calls hideAsync once
  // it mounts, so gating its mount here is enough.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
