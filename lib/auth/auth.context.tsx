import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import { queryClient } from '@/lib/api';
import { identify, resetAnalytics } from '@/lib/analytics';
import { isGoogleSignInAvailable } from '@/lib/supabase';

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
  startupError: string | null;
  isGoogleSignInAvailable: boolean;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: RegisterCredentials) => Promise<void>;
  signInWithGoogle: () => Promise<boolean>;
  completeGoogleSignInFromCallback: (url: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: (patch: Partial<User>) => Promise<void>;
  retryBootstrap: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        setStartupError(null);
        const session = await authService.restoreSession();
        if (mounted && session) {
          setUser(session.user);
        }
      } catch (error) {
        if (__DEV__) {
          console.error('[Auth] bootstrap falhou:', error);
        }
        if (mounted) {
          setStartupError(getAuthErrorMessage(error));
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    setIsLoading(true);
    bootstrap();

    return () => {
      mounted = false;
    };
  }, [bootstrapAttempt]);

  const retryBootstrap = useCallback(() => {
    setBootstrapAttempt((current) => current + 1);
  }, []);

  const applySession = useCallback((session: AuthSession) => {
    setUser(session.user);
    identify(session.user?.id ?? null);
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

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    try {
      const result = await authService.loginWithGoogle();
      if (result === 'web-redirect') {
        return false;
      }
      applySession(result);
      return true;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, [applySession]);

  const completeGoogleSignInFromCallback = useCallback(async (url: string) => {
    try {
      const session = await authService.completeGoogleOAuthCallback(url);
      applySession(session);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, [applySession]);

  const signOut = useCallback(async () => {
    await authService.logout();
    setUser(null);
    resetAnalytics();
    queryClient.clear();
  }, []);

  const refreshUser = useCallback(async (patch: Partial<User>) => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      if (patch.name) {
        next.avatarInitials = patch.name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? '')
          .join('');
      }
      return next;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      startupError,
      isGoogleSignInAvailable: isGoogleSignInAvailable(),
      signIn,
      signUp,
      signInWithGoogle,
      completeGoogleSignInFromCallback,
      signOut,
      refreshUser,
      retryBootstrap,
    }),
    [
      user,
      isLoading,
      startupError,
      signIn,
      signUp,
      signInWithGoogle,
      completeGoogleSignInFromCallback,
      signOut,
      refreshUser,
      retryBootstrap,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
