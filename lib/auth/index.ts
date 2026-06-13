export { AuthProvider } from './auth.context';
export { useAuth } from './useAuth';
export { isMockAuthEnabled, isMockOcrDemoEnabled } from './mock-auth';
export { isSupabaseEnabled } from '@/lib/supabase';
export * as authService from './auth.service';
export { getAuthErrorMessage } from './errors';
export { loginSchema, registerSchema, forgotPasswordSchema } from './schemas';
export type {
  User,
  AuthSession,
  LoginCredentials,
  RegisterCredentials,
} from './types';
export { AUTH_ENDPOINTS } from './constants';
