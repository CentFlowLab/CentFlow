import { Linking } from 'react-native';

/** Páginas legais e contacto, publicadas em miven.pt (site/privacidade, site/termos). */
export const PRIVACY_URL = 'https://miven.pt/privacidade/';
export const TERMS_URL = 'https://miven.pt/termos/';
export const CONTACT_EMAIL = 'mivenapp@gmail.com';

export function openExternal(url: string): void {
  void Linking.openURL(url).catch(() => {
    console.error('[links] open_failed');
  });
}
