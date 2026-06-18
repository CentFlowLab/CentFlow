/**
 * expo-secure-store: chaves só podem conter A-Z, a-z, 0-9, ".", "-" e "_".
 * Nunca usar ":" ou outros caracteres.
 */
export function userScopedSecureKey(scope: string, userId: string): string {
  const safeId = userId.trim().replace(/[^A-Za-z0-9._-]/g, '_');
  if (!safeId) {
    throw new Error('Identificador de utilizador inválido para SecureStore.');
  }
  return `centflow_${scope}_${safeId}`;
}

export function appScopedSecureKey(scope: string): string {
  const safeScope = scope.trim().replace(/[^A-Za-z0-9._-]/g, '_');
  if (!safeScope) {
    throw new Error('Scope inválido para SecureStore.');
  }
  return `centflow_${safeScope}`;
}
