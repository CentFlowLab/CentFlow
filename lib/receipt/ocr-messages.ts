/** Mensagem padrão quando o OCR não extrai dados utilizáveis. */
export const DEFAULT_OCR_FAILED_MESSAGE =
  'Não conseguimos ler este talão. Podes preencher os dados manualmente.';

/** @deprecated Preferir DEFAULT_OCR_FAILED_MESSAGE */
export const DEFAULT_OCR_UNAVAILABLE_MESSAGE = DEFAULT_OCR_FAILED_MESSAGE;

export function resolveOcrUserMessage(reason?: string): string {
  if (!reason?.trim()) return DEFAULT_OCR_UNAVAILABLE_MESSAGE;

  const normalized = reason.toLowerCase();
  if (
    normalized.includes('indisponível') ||
    normalized.includes('não disponível') ||
    normalized.includes('stack') ||
    normalized.includes('error') ||
    normalized.includes('api')
  ) {
    return DEFAULT_OCR_UNAVAILABLE_MESSAGE;
  }

  return reason.includes('Preenche') ? reason : `${reason} Podes preencher manualmente.`;
}
