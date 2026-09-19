import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Per-build-profile environment. Populated by EAS Build env vars / .env
 * files; falls back to sane local-dev defaults so `expo start` works with
 * no extra setup.
 */
const APP_ENV = process.env.APP_ENV ?? 'development';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://you-i.onrender.com';
const WS_URL = process.env.EXPO_PUBLIC_WS_URL ?? API_URL;
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://you-i.onrender.com';
const BUNDLE_IDENTIFIER_SUFFIX = APP_ENV === 'production' ? '' : `.${APP_ENV}`;

// Permanent Play Store identifier. Must never change after first publish.
const ANDROID_PACKAGE = 'com.youandi.app';
const IOS_BUNDLE_IDENTIFIER = 'com.youandi.mobile';

// Android App Links need the exact host served by the web app.
// new URL is safe here because app.config.ts runs in Node during the Expo build.
const WEB_HOST = (() => {
  try {
    return new URL(WEB_URL).hostname;
  } catch {
    return 'you-i.onrender.com';
  }
})();

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  owner: 'parvsharma',
  name: 'You & I',
  slug: 'mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'youandi',
  userInterfaceStyle: 'automatic',
  locales: {
    en: { CFBundleDisplayName: 'You & I', app_name: 'You & I' },
    es: { CFBundleDisplayName: 'You & I', app_name: 'You & I' },
    fr: { CFBundleDisplayName: 'You & I', app_name: 'You & I' },
    de: { CFBundleDisplayName: 'You & I', app_name: 'You & I' },
    hi: { CFBundleDisplayName: 'You & I', app_name: 'You & I' },
    pt: { CFBundleDisplayName: 'You & I', app_name: 'You & I' },
    ja: { CFBundleDisplayName: 'You & I', app_name: 'You & I' },
    ko: { CFBundleDisplayName: 'You & I', app_name: 'You & I' },
    zh: { CFBundleDisplayName: 'You & I', app_name: 'You & I' },
  },
  ios: {
    ...config.ios,
    icon: './assets/expo.icon',
    bundleIdentifier: `${IOS_BUNDLE_IDENTIFIER}${BUNDLE_IDENTIFIER_SUFFIX}`,
    associatedDomains: [`applinks:${WEB_HOST}`],
  },
  android: {
    ...config.android,
    package: `${ANDROID_PACKAGE}${BUNDLE_IDENTIFIER_SUFFIX}`,
    // versionCode is intentionally omitted; EAS Build auto-increments it.
    // Ensure the layout resizes when the keyboard opens so
    // KeyboardAvoidingView can keep the submit button visible.
    softwareKeyboardLayoutMode: 'resize',
    // Player IDs are bearer secrets; disable Android Auto Backup.
    allowBackup: false,
    // Keep only permissions the app actually uses. Every extra permission is a
    // data-safety form question and a reason not to install.
    permissions: ['INTERNET', 'VIBRATE', 'WRITE_EXTERNAL_STORAGE'],
    blockedPermissions: [
      'SYSTEM_ALERT_WINDOW',
      'READ_EXTERNAL_STORAGE',
      'READ_MEDIA_VISUAL_USER_SELECTED',
      'READ_MEDIA_IMAGES',
      'READ_MEDIA_VIDEO',
      'READ_MEDIA_AUDIO',
      'ACCESS_MEDIA_LOCATION',
    ],
    intentFilters: [
      {
        autoVerify: true,
        action: 'VIEW',
        data: [
          {
            scheme: 'https',
            host: WEB_HOST,
            pathPrefix: '/lobby',
          },
          {
            scheme: 'https',
            host: WEB_HOST,
            pathPrefix: '/j',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundColor: '#E6F4FE',
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
        resizeMode: 'contain',
        dark: {
          backgroundColor: '#0F172A',
          image: './assets/images/splash-icon.png',
        },
      },
    ],
    'expo-sharing',
    [
      'expo-media-library',
      {
        photosPermission:
          'Allow You & I to save your result image to your photo library.',
        savePhotosPermission:
          'Allow You & I to save your result image to your photo library.',
        // We only save images; never read the user's library or access GPS metadata.
        isAccessMediaLocationEnabled: false,
        granularPermissions: [],
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
    webUrl: WEB_URL,
    appEnv: APP_ENV,
    eas: {
      ...config.extra?.eas,
      projectId: 'e6d67bf9-d105-4ece-8cdb-50de688c4f11',
    },
  },
});
