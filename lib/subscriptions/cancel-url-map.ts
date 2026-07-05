/** Mapa estático merchant → URL de cancelamento (evolui por OTA). */

const CANCEL_URL_ENTRIES: Array<{ pattern: string; url: string }> = [
  { pattern: 'netflix', url: 'https://www.netflix.com/cancelplan' },
  { pattern: 'spotify', url: 'https://www.spotify.com/account/subscription/' },
  { pattern: 'disney', url: 'https://www.disneyplus.com/account' },
  { pattern: 'hbo', url: 'https://auth.max.com/subscription' },
  { pattern: 'max', url: 'https://auth.max.com/subscription' },
  { pattern: 'amazon prime', url: 'https://www.amazon.pt/gp/primecentral' },
  { pattern: 'prime video', url: 'https://www.amazon.pt/gp/primecentral' },
  { pattern: 'apple tv', url: 'https://tv.apple.com/settings' },
  { pattern: 'icloud', url: 'https://www.icloud.com/settings/' },
  { pattern: 'youtube premium', url: 'https://www.youtube.com/paid_memberships' },
  { pattern: 'google one', url: 'https://one.google.com/settings' },
  { pattern: 'microsoft 365', url: 'https://account.microsoft.com/services' },
  { pattern: 'office 365', url: 'https://account.microsoft.com/services' },
  { pattern: 'adobe', url: 'https://account.adobe.com/plans' },
  { pattern: 'notion', url: 'https://www.notion.so/my-account' },
  { pattern: 'dropbox', url: 'https://www.dropbox.com/account/plan' },
  { pattern: 'chatgpt', url: 'https://chat.openai.com/#settings/Account' },
  { pattern: 'openai', url: 'https://chat.openai.com/#settings/Account' },
  { pattern: 'gym', url: 'https://www.google.com/search?q=cancelar+subscricao+ginasio' },
  { pattern: 'ginasio', url: 'https://www.google.com/search?q=cancelar+subscricao+ginasio' },
  { pattern: 'fitness', url: 'https://www.google.com/search?q=cancelar+subscricao+ginasio' },
  { pattern: 'vodafone', url: 'https://www.vodafone.pt/particulares/conta.html' },
  { pattern: 'meo', url: 'https://www.meo.pt/conta' },
  { pattern: 'nos', url: 'https://www.nos.pt/conta' },
];

export function normalizeSubscriptionMerchantKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Devolve URL de cancelamento se o nome corresponder a um serviço conhecido. */
export function resolveSubscriptionCancelUrl(name: string): string | null {
  const key = normalizeSubscriptionMerchantKey(name);
  if (!key) return null;

  for (const entry of CANCEL_URL_ENTRIES) {
    if (key.includes(entry.pattern)) {
      return entry.url;
    }
  }

  return null;
}
