/** Endpoints de autenticação — ajustar se o backend usar paths diferentes. */
export const AUTH_ENDPOINTS = {
  login: '/auth/login',
  register: '/auth/register',
  me: '/auth/me',
  forgotPassword: '/auth/forgot-password',
} as const;

export const TOKEN_STORAGE_KEY = 'centflow_auth_token';
