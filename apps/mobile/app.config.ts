import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Per-build-profile environment. Populated by EAS Build env vars / .env
 * files; falls back to sane local-dev defaults so `expo start` works with
 * no extra setup.
 */
const APP_ENV = process.env.APP_ENV ?? 'development';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
const WS_URL = process.env.EXPO_PUBLIC_WS_URL ?? API_URL;
const BUNDLE_IDENTIFIER_SUFFIX = APP_ENV === 'production' ? '' : `.${APP_ENV}`;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'mobile',
  slug: 'mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'mobile',
  userInterfaceStyle: 'automatic',
  ios: {
    ...config.ios,
    icon: './assets/expo.icon',
    bundleIdentifier: `com.youandi.mobile${BUNDLE_IDENTIFIER_SUFFIX}`,
  },
  android: {
    ...config.android,
    package: `com.youandi.mobile${BUNDLE_IDENTIFIER_SUFFIX}`,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    ...config.web,
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    ...config.extra,
    apiUrl: API_URL,
    wsUrl: WS_URL,
    appEnv: APP_ENV,
  },
});
