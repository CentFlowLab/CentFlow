import { API_BASE_URL, ApiError, isLegacyPlaceholderApiUrl } from '@/lib/api/client';
import { isRealDataOnlyVariant } from '@/lib/config/app-variant';

export type ScreenErrorContext =
  | 'dashboard'
  | 'movements'
  | 'analysis'
  | 'prices'
  | 'assets'
  | 'profile'
  | 'generic';

type ScreenErrorCopy = {
  title: string;
  fallbackDescription: string;
};

const SCREEN_ERROR_COPY: Record<ScreenErrorContext, ScreenErrorCopy> = {
  dashboard: {
    title: 'Não conseguimos carregar o início',
    fallbackDescription:
      'O resumo das tuas finanças não está disponível neste momento. Verifica a ligação e tenta outra vez.',
  },
  movements: {
    title: 'Movimentos indisponíveis',
    fallbackDescription:
      'Não foi possível obter a lista de transações. Puxa para atualizar ou tenta novamente em instantes.',
  },
  analysis: {
    title: 'Análises temporariamente indisponíveis',
    fallbackDescription:
      'Os insights do teu património não carregaram. Isto costuma resolver-se com uma nova tentativa.',
  },
  prices: {
    title: 'Preços não carregados',
    fallbackDescription:
      'Não conseguimos calcular a inflação pessoal agora. Verifica a internet e tenta de novo.',
  },
  assets: {
    title: 'Ativos indisponíveis',
    fallbackDescription:
      'Objetivos, garantias e inventário não carregaram. Tenta novamente dentro de momentos.',
  },
  profile: {
    title: 'Perfil indisponível',
    fallbackDescription:
      'Não foi possível obter os dados da tua conta. Verifica a ligação e tenta outra vez.',
  },
  generic: {
    title: 'Algo correu mal',
    fallbackDescription:
      'Não foi possível concluir o pedido. Verifica a ligação à internet e tenta novamente.',
  },
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
      msg.includes('network request failed')
    );
  }
  return false;
}

function isLocalApiUrl(): boolean {
  return API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1');
}

function isPlaceholderApiUrl(): boolean {
  return isLegacyPlaceholderApiUrl();
}

function getNetworkMessage(): string {
  if (isLocalApiUrl()) {
    return 'Não foi possível ligar ao servidor local. No telemóvel, usa o IP do teu PC na mesma Wi‑Fi no ficheiro .env.';
  }
  if (isPlaceholderApiUrl()) {
    if (isRealDataOnlyVariant()) {
      return 'Não foi possível ligar ao servidor. Verifica a internet e tenta novamente.';
    }
    return 'O servidor ainda não está disponível. Para testar offline, activa EXPO_PUBLIC_MOCK_AUTH=true.';
  }
  return 'Sem ligação ao servidor. Verifica a internet ou tenta mais tarde.';
}

function getStatusMessage(status: number, bodyMessage?: string): string | null {
  if (status === 401) {
    return 'A tua sessão expirou. Termina sessão e volta a entrar.';
  }
  if (status === 403) {
    return 'Não tens permissão para aceder a estes dados.';
  }
  if (status === 404) {
    return 'O recurso pedido não foi encontrado.';
  }
  if (status === 429) {
    return 'Demasiados pedidos seguidos. Aguarda alguns segundos e tenta outra vez.';
  }
  if (status >= 500) {
    return 'O servidor está com dificuldades. Tenta novamente dentro de momentos.';
  }
  if (bodyMessage) return bodyMessage;
  return null;
}

export function getScreenErrorContent(
  error: unknown,
  context: ScreenErrorContext = 'generic',
): { title: string; description: string } {
  const copy = SCREEN_ERROR_COPY[context];

  if (isNetworkFailure(error)) {
    return {
      title: copy.title,
      description: getNetworkMessage(),
    };
  }

  if (error instanceof ApiError) {
    const body = error.body as { message?: string; error?: string } | undefined;
    const bodyMessage = body?.message ?? body?.error;
    const statusMessage = getStatusMessage(error.status, bodyMessage);

    if (statusMessage) {
      return { title: copy.title, description: statusMessage };
    }
  }

  if (error instanceof Error && error.message && error.message !== 'NETWORK_ERROR') {
    const normalized = error.message.toLowerCase();

    if (
      normalized.includes('schema cache') ||
      normalized.includes('could not find') ||
      normalized.includes('column') ||
      normalized.includes('pgrst')
    ) {
      return {
        title: copy.title,
        description: `Não foi possível concluir o pedido. Tenta novamente.`,
      };
    }

    if (normalized.includes('jwt') || normalized.includes('session')) {
      return {
        title: copy.title,
        description: 'A tua sessão expirou. Inicia sessão novamente.',
      };
    }

    if (normalized.includes('cancelado')) {
      return {
        title: copy.title,
        description: error.message,
      };
    }

    return {
      title: copy.title,
      description: error.message,
    };
  }

  return {
    title: copy.title,
    description: copy.fallbackDescription,
  };
}

/** Mensagem curta para toasts, modais e campos inline. */
export function getApiErrorMessage(error: unknown, context = 'os dados'): string {
  if (error instanceof Error) {
    const normalized = error.message.toLowerCase();
    if (
      normalized.includes('schema cache') ||
      normalized.includes('could not find') ||
      normalized.includes('pgrst')
    ) {
      if (context === 'a conta') {
        return 'Não foi possível guardar a conta. Tenta novamente.';
      }
      return `Não foi possível guardar ${context}. Tenta novamente.`;
    }
  }

  const { description } = getScreenErrorContent(error, 'generic');
  if (description !== SCREEN_ERROR_COPY.generic.fallbackDescription) {
    return description;
  }
  return `Ocorreu um erro ao obter ${context}. Tenta novamente.`;
}

/** Erro específico de upload de talão — distingue de falha ao criar movimento */
export class ReceiptUploadError extends Error {
  override name = 'ReceiptUploadError';

  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}

export function getReceiptUploadErrorMessage(error: unknown): string {
  if (error instanceof ReceiptUploadError) {
    return error.message;
  }
  return getApiErrorMessage(error, 'o talão');
}
