import {
  SpaceMono_400Regular,
  SpaceMono_700Bold,
  useFonts as useSpaceMono,
} from '@expo-google-fonts/space-mono';
import {
  VT323_400Regular,
  useFonts as useVt323,
} from '@expo-google-fonts/vt323';

/**
 * Native port of the two Google Fonts the web app loads via
 * `@import url('https://fonts.googleapis.com/css2?family=VT323&family=Space+Mono...')`
 * in globals.css. Only the weights actually used on web are bundled:
 * VT323 (single weight) for display type, Space Mono 400/700 for body type.
 * Matches `fontFamily.display`/`fontFamily.body`/`fontFamily.body-bold` in
 * tailwind.config.js.
 */
export const FONT_FAMILY = {
  display: 'VT323_400Regular',
  body: 'SpaceMono_400Regular',
  bodyBold: 'SpaceMono_700Bold',
} as const;

export function useAppFonts() {
  const [vt323Loaded, vt323Error] = useVt323({ VT323_400Regular });
  const [spaceMonoLoaded, spaceMonoError] = useSpaceMono({
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  return {
    fontsLoaded: vt323Loaded && spaceMonoLoaded,
    fontError: vt323Error ?? spaceMonoError ?? null,
  };
}
