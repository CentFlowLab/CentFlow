import { useMemo } from 'react';

import { useAuth } from '@/lib/auth';

import { identify, track } from './analytics.service';
import type { TrackEvent } from './events';

/**
 * useAnalytics
 *
 * Convenience hook that:
 * - Automatically calls identify() when the authenticated user changes
 * - Returns a typed `track` function ready to use in components
 *
 * Usage (recommended in screens/components that need to emit events):
 *
 *   const { track } = useAnalytics();
 *   track(AnalyticsEvents.RECEIPT_SCANNED, { items_count: 3, has_ocr_items: true });
 *
 * It is safe (and encouraged) to call this hook in multiple places.
 * The identify side-effect is idempotent.
 */
export function useAnalytics(): { track: TrackEvent; identify: typeof identify } {
  const { user } = useAuth();

  return useMemo(() => {
    // Side-effect: keep the global analytics context in sync with auth state
    if (user?.id) {
      identify(user.id);
    }
    return {
      track,
      identify,
    };
  }, [user?.id]);
}
