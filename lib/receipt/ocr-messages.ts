/** Mensagem padrão quando o OCR não extrai dados utilizáveis. */
export const DEFAULT_OCR_UNAVAILABLE_MESSAGE =
  'Não foi possível ler o talão automaticamente. Verifica a imagem (bem iluminada e focada) e preenche os campos manualmente.';

export function resolveOcrUserMessage(reason?: string): string {
  if (!reason?.trim()) return DEFAULT_OCR_UNAVAILABLE_MESSAGE;
  if (reason.includes('Preenche manualmente')) return reason;
  return `${reason} Preenche os campos manualmente.`;
}
