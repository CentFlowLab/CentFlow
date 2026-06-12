import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import { queryClient } from '@/lib/api';

import * as authService from './auth.service';
import { getAuthErrorMessage } from './errors';
import type {
  AuthSession,
  LoginCredentials,
  RegisterCredentials,
  User,
} from './types';

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: RegisterCredentials) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const session = await authService.restoreSession();
        if (mounted && session) {
          setUser(session.user);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const applySession = useCallback((session: AuthSession) => {
    setUser(session.user);
  }, []);

  const signIn = useCallback(async (credentials: LoginCredentials) => {
    try {
      const session = await authService.login(credentials);
      applySession(session);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, [applySession]);

  const signUp = useCallback(async (credentials: RegisterCredentials) => {
    try {
      const session = await authService.register(credentials);
      applySession(session);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, [applySession]);

  const signOut = useCallback(async () => {
    await authService.logout();
    setUser(null);
    queryClient.clear();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      signIn,
      signUp,
      signOut,
    }),
    [user, isLoading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
