import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const ENV = import.meta.env.MODE; // 'development' | 'production'

export function initSentry() {
  if (!DSN) return; // No-op in local dev without a DSN configured

  Sentry.init({
    dsn: DSN,
    environment: ENV,
    // Only send traces in production to avoid polluting dev quota
    tracesSampleRate: ENV === 'production' ? 0.2 : 0,
    // Capture replays for 10% of sessions, 100% on error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Don't send errors from localhost
    beforeSend(event) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        return null;
      }
      return event;
    },
  });
}

/** Call after auth resolves to tag every subsequent event with the user. */
export function identifySentryUser(userId: string, email?: string) {
  if (!DSN) return;
  Sentry.setUser({ id: userId, email });
}

/** Call on sign-out. */
export function clearSentryUser() {
  if (!DSN) return;
  Sentry.setUser(null);
}

/** Tag every event with the active org. */
export function setSentryOrg(orgId: string, orgName?: string) {
  if (!DSN) return;
  Sentry.setTag('org_id', orgId);
  if (orgName) Sentry.setTag('org_name', orgName);
}

/** Manually capture an exception with optional context. */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
) {
  if (!DSN) {
    console.error('[Sentry stub]', error, context);
    return;
  }
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

/** Manually capture a non-fatal message. */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info'
) {
  if (!DSN) return;
  Sentry.captureMessage(message, level);
}

export { Sentry };
