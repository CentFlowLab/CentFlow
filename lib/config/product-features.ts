/** Flags de produto — activar funcionalidades quando backend/migrations estão prontos. */

/** UI de contas bancárias oculta — tabela `accounts` mantém-se na BD. */
export const ACCOUNTS_FEATURE_ENABLED = false;

/**
 * OCR de talões — desligado na UI principal até validação em dispositivo real.
 * Formulário manual permanece a experiência padrão.
 * Activar com EXPO_PUBLIC_RECEIPT_OCR_UI=true.
 */
export function isReceiptOcrUiEnabled(): boolean {
  return process.env.EXPO_PUBLIC_RECEIPT_OCR_UI === 'true';
}
