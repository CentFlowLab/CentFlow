import type { AuthState } from './AuthProvider';

/**
 * Acesso à app (ADR-034): só com conta. Sem sessão, ficam acessíveis apenas as boas-vindas e as
 * páginas de autenticação, e nenhuma base de dados local é aberta.
 * `unavailable` (Supabase por configurar) só existe em desenvolvimento e nos testes; numa
 * compilação de produção é um erro de configuração, nunca uso sem conta.
 */
export type AppAccess = 'loading' | 'granted' | 'signedOut' | 'misconfigured';

export function appAccessFor(state: AuthState, isDevelopment: boolean): AppAccess {
  switch (state.status) {
    case 'loading':
      return 'loading';
    case 'signedIn':
      return 'granted';
    case 'unavailable':
      return isDevelopment ? 'granted' : 'misconfigured';
    default:
      return 'signedOut';
  }
}
