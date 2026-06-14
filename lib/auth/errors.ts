import { API_BASE_URL, ApiError } from '@/lib/api/client';

const AUTH_MESSAGES: Record<number, string> = {
  400: 'Dados inválidos. Verifica os campos e tenta novamente.',
  401: 'Email ou password incorretos.',
  403: 'Não tens permissão para aceder.',
  404: 'Conta não encontrada.',
  409: 'Este email já está registado.',
  422: 'Dados inválidos. Verifica os campos.',
  429: 'Demasiadas tentativas. Aguarda um momento.',
  500: 'Erro no servidor. Tenta mais tarde.',
};

type ErrorBody = {
  message?: string;
  error?: string;
  errors?: Array<{ message?: string }>;
};

function isNetworkFailure(error: unknown): boolean {
  if (error instanceof ApiError && error.status === 0) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      error.message === 'Failed to fetch' ||
      error.message === 'NETWORK_ERROR' ||
      error.message.includes('Network request failed') ||
      msg.includes('fetch failed') ||
      msg.includes('hostname could not be found') ||
      msg.includes('network request failed')
    );
  }
  return false;
}

function isPlaceholderApiUrl(): boolean {
  return API_BASE_URL.includes('api.centflow.app');
}

/** Mensagens legíveis para erros comuns do Supabase Auth. */
function mapSupabaseAuthMessage(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('email rate limit exceeded')) {
    return (
      'Limite de emails do servidor atingido (muitas tentativas de registo ou recuperação de password). ' +
      'Aguarda 30–60 minutos e tenta novamente, ou usa «Entrar» se a conta já foi criada.'
    );
  }

  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'Este email já está registado. Usa «Entrar» com a tua password.';
  }

  if (lower.includes('invalid login credentials')) {
    return 'Email ou password incorretos.';
  }

  if (lower.includes('email not confirmed')) {
    return 'Confirma o teu email antes de entrar (verifica a caixa de entrada e spam).';
  }

  if (lower.includes('signup is disabled')) {
    return 'O registo de novas contas está temporariamente desactivado.';
  }

  if (lower.includes('password should be at least')) {
    return 'A password deve ter pelo menos 6 caracteres.';
  }

  if (lower.includes('unable to validate email address')) {
    return 'Email inválido. Verifica o endereço e tenta novamente.';
  }

  if (
    lower.includes('provider is not enabled') ||
    lower.includes('unsupported provider')
  ) {
    return (
      'Login com Google não está activo no servidor. No Supabase Dashboard, activa ' +
      'Authentication → Providers → Google e configura o Client ID e Client Secret ' +
      '(Google Cloud Console).'
    );
  }

  return message;
}

export function getAuthErrorMessage(error: unknown): string {
  if (isNetworkFailure(error)) {
    const isLocalhost = API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1');

    if (isLocalhost) {
      return (
        'Não foi possível ligar à API. No telemóvel, localhost não funciona — ' +
        'usa o IP do teu PC na mesma Wi‑Fi (ex: http://192.168.1.72:3000) no ficheiro .env.'
      );
    }

    if (isPlaceholderApiUrl()) {
      return (
        'O servidor da API ainda não está disponível (api.centflow.app). ' +
        'Para testar no telemóvel, gera um IPA com EXPO_PUBLIC_MOCK_AUTH=true no GitHub Actions.'
      );
    }

    return (
      `Não foi possível ligar ao servidor (${API_BASE_URL}). ` +
      'Verifica a internet, se a API está online e se o URL está correcto no .env.'
    );
  }

  if (error instanceof ApiError) {
    const body = error.body as ErrorBody | undefined;

    if (body?.message) return body.message;
    if (body?.error) return body.error;
    if (body?.errors?.[0]?.message) return body.errors[0].message;
    if (AUTH_MESSAGES[error.status]) return AUTH_MESSAGES[error.status];
  }

  if (error instanceof Error && error.message && error.message !== 'NETWORK_ERROR') {
    return mapSupabaseAuthMessage(error.message);
  }

  return 'Ocorreu um erro inesperado. Tenta novamente.';
}
