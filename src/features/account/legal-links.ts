import { Linking } from 'react-native';

/** Páginas legais, ajuda e contacto, publicadas em miven.pt (site/privacidade, site/termos, site/suporte). */
export const PRIVACY_URL = 'https://miven.pt/privacidade/';
export const TERMS_URL = 'https://miven.pt/termos/';
/** Ajuda e contacto (também é o URL de suporte na App Store). */
export const SUPPORT_URL = 'https://miven.pt/suporte/';
export const CONTACT_EMAIL = 'mivenapp@gmail.com';

export function openExternal(url: string): void {
  void Linking.openURL(url).catch(() => {
    console.error('[links] open_failed');
  });
}
