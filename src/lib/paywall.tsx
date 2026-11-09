import type { PropsWithChildren } from 'react';
import { Platform } from 'react-native';

/**
 * Superwall preparado, sem paywall visível (ADR-033). Só monta o SDK com
 * EXPO_PUBLIC_PAYWALL_ENABLED=true e a chave pública da plataforma. Não há produtos nem
 * colocações (placements) na app: ligar a flag sozinha não mostra nada ao utilizador.
 */
const enabledFlag = process.env.EXPO_PUBLIC_PAYWALL_ENABLED === 'true';
const iosKey = process.env.EXPO_PUBLIC_SUPERWALL_IOS_KEY ?? '';
const androidKey = process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_KEY ?? '';

export function paywallEnabled(): boolean {
  if (!enabledFlag) return false;
  if (Platform.OS === 'ios') return iosKey !== '';
  if (Platform.OS === 'android') return androidKey !== '';
  return false;
}

export function PaywallProvider({ children }: PropsWithChildren) {
  if (!paywallEnabled()) return children;
  // Carregado só aqui: o módulo nativo não existe na web nem nos testes.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SuperwallProvider } = require('expo-superwall') as typeof import('expo-superwall');
  return (
    <SuperwallProvider
      apiKeys={{ ios: iosKey || undefined, android: androidKey || undefined }}
      onConfigurationError={() => console.warn('[paywall] configuration failed')}>
      {children}
    </SuperwallProvider>
  );
}
