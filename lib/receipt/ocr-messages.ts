/** Mensagem principal quando o OCR não consegue extrair dados. */
export const OCR_READ_FAILURE_MESSAGE = 'Não conseguimos ler este talão.';

/** Mensagem padrão quando o OCR não extrai dados utilizáveis. */
export const DEFAULT_OCR_UNAVAILABLE_MESSAGE =
  `${OCR_READ_FAILURE_MESSAGE} Verifica a imagem (bem iluminada e focada) e preenche os campos manualmente.`;

export function resolveOcrUserMessage(reason?: string): string {
  if (!reason?.trim()) return DEFAULT_OCR_UNAVAILABLE_MESSAGE;

  const lower = reason.toLowerCase();
  if (
    lower.includes('não conseguimos ler') ||
    lower.includes('preenche manualmente') ||
    lower.includes('preenche os campos')
  ) {
    return reason;
  }

  return `${OCR_READ_FAILURE_MESSAGE} Preenche os campos manualmente.`;
}
