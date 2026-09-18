/**
 * Lightweight error reporter abstraction.
 *
 * Today this logs to the console in development and does nothing in
 * production. To route errors somewhere you can read later, wire
 * `reportError` to a service such as Sentry.
 *
 * Lightweight option: Sentry for React Native (@sentry/react-native).
 * It supports the React Native New Architecture, has a small native
 * footprint, and captures both JS crashes and native crashes.
 *
 * Google Play data-safety implication: crash reporting collects
 * "App info and performance" data (crashes, ANRs). You must disclose
 * this in Play Console > App content > Data safety. Never attach
 * sensitive identifiers such as player IDs to crash reports; mask or
 * omit them.
 */

export type ErrorContext = {
  component?: string;
  route?: string;
  [key: string]: unknown;
};

function maskSensitiveValues(context: ErrorContext): ErrorContext {
  const masked: ErrorContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (typeof value === 'string' && value.length > 8) {
      masked[key] = `${value.slice(0, 4)}…${value.slice(-4)}`;
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

export function reportError(error: Error, context: ErrorContext = {}): void {
  const maskedContext = maskSensitiveValues(context);

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error('[error-reporter]', error, maskedContext);
    return;
  }

  // TODO: wire to Sentry / Bugsnag / self-hosted endpoint.
  // Example with Sentry:
  // Sentry.captureException(error, { extra: maskedContext });
}
