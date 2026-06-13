/**
 * Onboarding gate — controla quais rotas autenticadas exigem onboarding concluído ou saltado.
 *
 * Fluxo:
 * - Utilizador autenticado sem onboarding → apenas `/onboarding` é acessível
 * - Após `complete()` ou `skip()` → todas as rotas (tabs, settings, deep links)
 * - `EXPO_PUBLIC_SKIP_ONBOARDING=true` → bypass total (desenvolvimento)
 *
 * A lógica de redireccionamento vive em `OnboardingGateEffect` (app/_layout.tsx).
 */

export function isOnboardingGateBypassed(): boolean {
  return process.env.EXPO_PUBLIC_SKIP_ONBOARDING === 'true';
}

export function isOnboardingRoute(segments: readonly string[]): boolean {
  return segments[0] === 'onboarding';
}

/** Rotas autenticadas que exigem onboarding concluído ou saltado. */
export function isGatedAuthenticatedRoute(segments: readonly string[]): boolean {
  const root = segments[0];
  if (!root) return false;
  if (root === 'onboarding') return false;
  return true;
}
