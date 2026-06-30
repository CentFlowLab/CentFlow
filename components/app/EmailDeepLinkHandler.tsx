import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { logAppError } from '@/lib/diagnostics';
import { resolveEmailDeepLinkRoute } from '@/lib/email/deep-links';

/**
 * Navega para rotas internas quando a app abre via deep link de email (centflow://...).
 */
export function EmailDeepLinkHandler() {
  useEffect(() => {
    async function handleUrl(url: string | null) {
      try {
        if (!url || !url.startsWith('centflow://')) return;

        if (
          url.includes('auth/callback') ||
          url.includes('reset-password') ||
          url.includes('auth/reset')
        ) {
          return;
        }

        const route = resolveEmailDeepLinkRoute(url);
        if (route) {
          router.push(route);
        }
      } catch (error) {
        logAppError('email-deep-link', error, { url: url ?? undefined });
      }
    }

    void Linking.getInitialURL().then(handleUrl);

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    return () => subscription.remove();
  }, []);

  return null;
}
