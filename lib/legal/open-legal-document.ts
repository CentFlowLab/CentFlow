import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';

import { LEGAL_URLS } from '@/lib/config/legal';

type LegalDocument = 'privacy' | 'terms';

const IN_APP_ROUTES: Record<LegalDocument, string> = {
  privacy: '/legal/privacy-policy',
  terms: '/legal/terms',
};

const EXTERNAL_URLS: Record<LegalDocument, string> = {
  privacy: LEGAL_URLS.privacyPolicy,
  terms: LEGAL_URLS.termsOfService,
};

/** Abre documento legal: tenta URL externa; em falha, mostra versão in-app. */
export async function openLegalDocument(document: LegalDocument): Promise<void> {
  try {
    const result = await WebBrowser.openBrowserAsync(EXTERNAL_URLS[document], {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      enableBarCollapsing: true,
    });
    if (result.type === 'cancel' || result.type === 'dismiss') return;
  } catch {
    router.push(IN_APP_ROUTES[document] as never);
  }
}

export function openInAppLegalDocument(document: LegalDocument): void {
  router.push(IN_APP_ROUTES[document] as never);
}
