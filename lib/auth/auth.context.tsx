import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { queryClient } from '@/lib/api';
import { setAccessToken } from '@/lib/api/token';
import { identify, resetAnalytics } from '@/lib/analytics';
import { isAppleSignInAvailable } from '@/lib/auth/apple-auth';
import { isGoogleSignInAvailable, isSupabaseEnabled } from '@/lib/supabase';
import {
  getSessionExpiredMessage,
  logSecurityEvent,
  subscribeToAuthSessionChanges,
} from '@/lib/security';
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
  sessionExpiredMessage: string | null;
  isGoogleSignInAvailable: boolean;
  isAppleSignInAvailable: boolean;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: RegisterCredentials) => Promise<void>;
  signInWithGoogle: () => Promise<boolean>;
  signInWithApple: () => Promise<boolean>;
  deleteAccount: () => Promise<void>;
  completeGoogleSignInFromCallback: (url: string) => Promise<void>;
  signOut: () => Promise<void>;
  signOutAllDevices: () => Promise<void>;
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
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const signingOutRef = useRef(false);

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

  useEffect(() => {
    if (!isSupabaseEnabled()) return;

    let unsubscribe: (() => void) | null = null;

    void subscribeToAuthSessionChanges(
      () => {
        setSessionExpiredMessage(null);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        queryClient.clear();
        if (!signingOutRef.current) {
          setSessionExpiredMessage(getSessionExpiredMessage());
          logSecurityEvent('session_cleared', undefined, 'warn');
        }
      },
    ).then((fn) => {
      unsubscribe = fn;
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

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
      const { triggerWelcomeEmail } = await import('@/lib/email/trigger');
      triggerWelcomeEmail();
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

  const signInWithApple = useCallback(async (): Promise<boolean> => {
    try {
      const session = await authService.loginWithApple();
      applySession(session);
      return true;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, [applySession]);

  const deleteAccount = useCallback(async () => {
    signingOutRef.current = true;
    try {
      await authService.deleteAccount();
      setUser(null);
      setSessionExpiredMessage(null);
      resetAnalytics();
      queryClient.clear();
    } finally {
      signingOutRef.current = false;
    }
  }, []);

  const completeGoogleSignInFromCallback = useCallback(async (url: string) => {
    try {
      const session = await authService.completeGoogleOAuthCallback(url);
      applySession(session);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, [applySession]);

  const signOut = useCallback(async () => {
    signingOutRef.current = true;
    try {
      await authService.logout();
      setUser(null);
      setSessionExpiredMessage(null);
      resetAnalytics();
      queryClient.clear();
    } finally {
      signingOutRef.current = false;
    }
  }, []);

  const signOutAllDevices = useCallback(async () => {
    signingOutRef.current = true;
    try {
      await authService.logoutAllDevices();
      setUser(null);
      setSessionExpiredMessage(null);
      resetAnalytics();
      queryClient.clear();
      logSecurityEvent('sign_out_all_devices');
    } finally {
      signingOutRef.current = false;
    }
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
      sessionExpiredMessage,
      isGoogleSignInAvailable: isGoogleSignInAvailable(),
      isAppleSignInAvailable: isAppleSignInAvailable(),
      signIn,
      signUp,
      signInWithGoogle,
      signInWithApple,
      deleteAccount,
      completeGoogleSignInFromCallback,
      signOut,
      signOutAllDevices,
      refreshUser,
      retryBootstrap,
    }),
    [
      user,
      isLoading,
      startupError,
      sessionExpiredMessage,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithApple,
      deleteAccount,
      completeGoogleSignInFromCallback,
      signOut,
      signOutAllDevices,
      refreshUser,
      retryBootstrap,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

