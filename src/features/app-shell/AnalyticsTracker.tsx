import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';

import { setAnalyticsConsent, trackScreen } from '@/lib/analytics';

import { usePreferences } from '../preferences';

/** Liga o PostHog só com consentimento e regista o nome de cada ecrã (sem identificadores). */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const { preferences, isLoaded } = usePreferences();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    setAnalyticsConsent(preferences.analytics)
      .catch(() => console.warn('[analytics] consent update failed'))
      .finally(() => {
        if (!cancelled) setReady(preferences.analytics);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, preferences.analytics]);

  useEffect(() => {
    if (ready) trackScreen(pathname);
  }, [ready, pathname]);

  return null;
}
