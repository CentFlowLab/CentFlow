import { useRouter, useSegments, type Href } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthLoadingScreen } from '@/components/auth';
import { useOnboarding } from '@/hooks/useOnboarding';
import {
  isGatedAuthenticatedRoute,
  isOnboardingGateBypassed,
  isOnboardingRoute,
} from '@/lib/onboarding/gate';

/**
 * Gate global de onboarding para rotas autenticadas.
 *
 * Protege tabs, settings e deep links. Só `/onboarding` fica acessível até
 * `completed`. Enquanto verifica o estado, mostra loading suave.
 */
export function OnboardingGateEffect() {
  const router = useRouter();
  const segments = useSegments();
  const { completed, isLoading } = useOnboarding();

  const bypass = isOnboardingGateBypassed();
  const onOnboarding = isOnboardingRoute(segments);
  const gatedRoute = isGatedAuthenticatedRoute(segments);

  useEffect(() => {
    if (bypass || !gatedRoute || isLoading) return;

    if (completed === false) {
      router.replace('/onboarding' as Href);
    }
  }, [bypass, completed, gatedRoute, isLoading, router]);

  useEffect(() => {
    if (bypass || isLoading || !onOnboarding) return;

    if (completed === true) {
      router.replace('/(tabs)/' as Href);
    }
  }, [bypass, completed, isLoading, onOnboarding, router]);

  const blockGatedRoute = !bypass && gatedRoute && (isLoading || completed === false);

  if (!blockGatedRoute) return null;

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <AuthLoadingScreen message="A preparar a tua experiência..." />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
  },
});
