import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

void SplashScreen.preventAutoHideAsync();

const bricolageFonts = {
  BricolageGrotesque_400: require('@/assets/fonts/BricolageGrotesque-400.ttf'),
  BricolageGrotesque_600: require('@/assets/fonts/BricolageGrotesque-600.ttf'),
  BricolageGrotesque_700: require('@/assets/fonts/BricolageGrotesque-700.ttf'),
  BricolageGrotesque_800: require('@/assets/fonts/BricolageGrotesque-800.ttf'),
};

const figtreeFonts = {
  Figtree_400: require('@/assets/fonts/Figtree-400.ttf'),
  Figtree_600: require('@/assets/fonts/Figtree-600.ttf'),
  Figtree_700: require('@/assets/fonts/Figtree-700.ttf'),
  Figtree_800: require('@/assets/fonts/Figtree-800.ttf'),
};

export const FONT_FAMILY = {
  display: 'BricolageGrotesque_400',
  display600: 'BricolageGrotesque_600',
  display700: 'BricolageGrotesque_700',
  display800: 'BricolageGrotesque_800',
  body: 'Figtree_400',
  body600: 'Figtree_600',
  body700: 'Figtree_700',
  body800: 'Figtree_800',
} as const;

export function useAppFonts() {
  const [fontsLoaded, fontError] = useFonts({
    ...bricolageFonts,
    ...figtreeFonts,
  });

  return {
    fontsLoaded,
    fontError,
  };
}
