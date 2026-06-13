import type { AuthSession, LoginCredentials, RegisterCredentials } from './types';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Modo dev: permite testar a app sem backend.
 * - EXPO_PUBLIC_MOCK_AUTH=true  → força mock
 * - EXPO_PUBLIC_MOCK_AUTH=false → força API real
 * - Por defeito em __DEV__ → mock activo (web + Expo Go)
 */
export function isMockAuthEnabled(): boolean {
  if (process.env.EXPO_PUBLIC_MOCK_AUTH === 'false') return false;
  if (process.env.EXPO_PUBLIC_MOCK_AUTH === 'true') return true;
  return __DEV__;
}

/** Dados OCR fictícios (Continente demo) — só com flag explícita */
export function isMockOcrDemoEnabled(): boolean {
  return process.env.EXPO_PUBLIC_MOCK_OCR === 'true';
}

export function createMockSession(
  credentials: LoginCredentials | RegisterCredentials,
): AuthSession {
  const name = 'name' in credentials ? credentials.name : 'Utilizador';

  return {
    token: 'mock-dev-token',
    user: {
      id: 'mock-user-1',
      name,
      email: credentials.email.trim().toLowerCase(),
      avatarInitials: getInitials(name),
      currency: 'EUR',
    },
  };
}

export function createMockGoogleSession(): AuthSession {
  const name = 'Utilizador Google';

  return {
    token: 'mock-google-token',
    user: {
      id: 'mock-google-user-1',
      name,
      email: 'google.user@gmail.com',
      avatarInitials: getInitials(name),
      currency: 'EUR',
    },
  };
}
