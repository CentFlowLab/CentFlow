import { API_BASE_URL, ApiError } from '@/lib/api/client';

export function getApiErrorMessage(error: unknown, context = 'os dados'): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      const isLocalhost =
        API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1');
      if (isLocalhost) {
        return 'Não foi possível ligar à API. Verifica se o servidor está a correr e se o URL no .env está correcto.';
      }
      return `Não foi possível ligar ao servidor (${API_BASE_URL}). Verifica a ligação à internet.`;
    }
    if (error.status === 401) {
      return 'A tua sessão expirou. Inicia sessão novamente.';
    }
    if (error.status >= 500) {
      return 'O servidor está temporariamente indisponível. Tenta dentro de momentos.';
    }
    const body = error.body as { message?: string } | undefined;
    if (body?.message) return body.message;
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
