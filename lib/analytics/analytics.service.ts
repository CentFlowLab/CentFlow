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

import { AnalyticsEvents, type AnalyticsEvent, type AnalyticsPayloads } from './events';

// Module-level user context (simple & effective for RN apps)
let currentUserId: string | null = null;

/**
 * Identify the current user for all subsequent events.
 * Call this as soon as we have a stable user id (after login / session restore).
 */
export function identify(userId: string | null): void {
  currentUserId = userId;

  // In a real provider you would call:
  // posthog.identify(userId);
  // or posthog.alias(...) etc.

  if (__DEV__) {
    console.log('[Analytics] identify', { userId });
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

  // ------------------------------------------------------------------
  // TODO (post-beta): send to real analytics backend
  //
  // Example PostHog:
  //   if (!isMockAuthEnabled()) {
  //     posthog.capture(eventName, payload);
  //   }
  //
  // Example Supabase (lightweight, privacy-friendly):
  //   supabase.from('analytics_events').insert({
  //     event: eventName,
  //     properties: properties ?? {},
  //     user_id: currentUserId,
  //     created_at: payload.timestamp,
  //   }).catch(() => {});
  //
  // Important: respect EXPO_PUBLIC_MOCK_* and do not spam during demo mode
  // if user has not opted in, or use anonymized ids.
  // ------------------------------------------------------------------
}

/**
 * Optional helper to reset user (on logout).
 * Keeps the module clean for the next authenticated user.
 */
export function resetAnalytics(): void {
  currentUserId = null;
  if (__DEV__) {
    console.log('[Analytics] reset');
  }
}

// Re-export events for convenience at call sites
export { AnalyticsEvents } from './events';
export type { AnalyticsEvent, AnalyticsPayloads } from './events';
