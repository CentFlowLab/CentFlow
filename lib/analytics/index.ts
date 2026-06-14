/**
 * CentFlow Analytics — Public API
 *
 * Prefer importing from here:
 *   import { track, AnalyticsEvents, useAnalytics } from '@/lib/analytics';
 *
 * Internal implementation lives in analytics.service.ts
 */

export { AnalyticsEvents, track, identify, resetAnalytics } from './analytics.service';
export { useAnalytics } from './useAnalytics';
export type { AnalyticsEvent, AnalyticsPayloads, TrackEvent } from './events';
