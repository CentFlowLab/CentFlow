/** Verifica se o cliente Sentry está activo (SDK v8+ não expõe isEnabled). */
export function isSentryClientActive(
  sentry: { getClient: () => unknown } | null | undefined,
): boolean {
  return sentry != null && sentry.getClient() != null;
}
