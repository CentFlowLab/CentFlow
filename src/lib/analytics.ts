import PostHog from 'posthog-react-native';

/**
 * Estatísticas de utilização (PostHog, região UE). Só arranca com a chave definida e o
 * consentimento do utilizador. Envia apenas o nome do ecrã: nunca valores, descrições, nomes,
 * identificadores de registos nem o email.
 */
const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

let client: PostHog | null = null;

export const analyticsAvailable = (): boolean => apiKey !== '';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Caminho sem identificadores nem parâmetros: `/entry/<uuid>?x=1` → `/entry/[id]`. */
export function screenName(pathname: string): string {
  const path = pathname.split(/[?#]/)[0] ?? '/';
  return path.replace(UUID, '[id]').replace(/\/\d+(?=\/|$)/g, '/[n]') || '/';
}

/** Liga ou desliga conforme o consentimento. Desligar apaga a fila local e para o envio. */
export async function setAnalyticsConsent(granted: boolean): Promise<void> {
  if (!analyticsAvailable()) return;
  if (granted) {
    client ??= new PostHog(apiKey, {
      host,
      defaultOptIn: false,
      captureAppLifecycleEvents: false,
      personProfiles: 'never',
    });
    await client.optIn();
    return;
  }
  if (client) {
    await client.optOut();
    client.reset();
  }
}

export function trackScreen(pathname: string): void {
  if (!client || client.optedOut) return;
  void client.screen(screenName(pathname));
}
