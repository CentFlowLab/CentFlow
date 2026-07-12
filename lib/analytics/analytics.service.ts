/**
 * CentFlow Product Analytics Service
 *
 * Lightweight, provider-agnostic analytics layer.
 *
 * Current behavior (MVP / pre-beta):
 * - In development (__DEV__): logs beautifully to console with [Analytics] prefix.
 * - In production: still logs (safe) + prepared for real provider.
 *
 * Future integration points (choose one):
 * - PostHog (recommended for mobile): `posthog.capture(event, properties)`
 * - Supabase: insert into an `analytics_events` table (edge function or direct with RLS)
 * - Mixpanel / Amplitude / Segment
 *
 * The service is intentionally dependency-free so it can be swapped without touching call sites.
 */

import { hashUserIdForSentry, setSentryUserFromHash } from '@/lib/sentry';
import { isMockAuthEnabled } from '@/lib/auth/mock-auth';
import { getSupabaseClient, isSupabaseEnabled } from '@/lib/supabase';

import { AnalyticsEvents, type AnalyticsEvent, type AnalyticsPayloads } from './events';

// Module-level user context (simple & effective for RN apps)
let currentUserId: string | null = null;

/**
 * Identify the current user for all subsequent events.
 * Call this as soon as we have a stable user id (after login / session restore).
 */
export function identify(userId: string | null): void {
  currentUserId = userId;

  void (async () => {
    const hash = userId ? await hashUserIdForSentry(userId) : null;
    setSentryUserFromHash(hash);
  })();

  if (__DEV__) {
    console.log('[Analytics] identify', { userId: userId ? '[hash]' : null });
  }
}

/**
 * Track a product event.
 *
 * @param eventName - One of the canonical events from AnalyticsEvents
 * @param properties - Optional strongly-typed properties for the event
 */
export function track<E extends AnalyticsEvent>(
  eventName: E,
  properties?: AnalyticsPayloads[E],
): void {
  const payload = {
    ...((properties ?? {}) as Record<string, unknown>),
    userId: currentUserId,
    timestamp: new Date().toISOString(),
    // Useful context for debugging / filtering later
    environment: __DEV__ ? 'development' : 'production',
  };

  // Always log in development for visibility during beta
  if (__DEV__) {
    // Pretty console output
    const propsStr =
      properties && Object.keys(properties as object).length > 0
        ? ` ${JSON.stringify(properties)}`
        : '';
    console.log(`[Analytics] ${eventName}${propsStr}`, {
      userId: currentUserId,
      ...((properties ?? {}) as Record<string, unknown>),
    });
  }

  // Persistência em Supabase (fire-and-forget; falhas silenciosas para não bloquear UX)
  if (!isMockAuthEnabled() && isSupabaseEnabled() && currentUserId) {
    const supabase = getSupabaseClient();
    void (supabase as { from: (table: string) => { insert: (row: unknown) => Promise<{ error: { message: string } | null }> } })
      .from('analytics_events')
      .insert({
        user_id: currentUserId,
        event: eventName,
        properties: (properties ?? {}) as Record<string, unknown>,
        environment: payload.environment as string,
      })
      .then(({ error }) => {
        if (error && __DEV__) {
          console.warn('[Analytics] persist failed', error.message);
        }
      });
  }
}

/**
 * Optional helper to reset user (on logout).
 * Keeps the module clean for the next authenticated user.
 */
export function resetAnalytics(): void {
  currentUserId = null;
  setSentryUserFromHash(null);
  if (__DEV__) {
    console.log('[Analytics] reset');
  }
}

// Re-export events for convenience at call sites
export { AnalyticsEvents } from './events';
export type { AnalyticsEvent, AnalyticsPayloads } from './events';
