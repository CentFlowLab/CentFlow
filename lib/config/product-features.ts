/** Flags de produto — activar funcionalidades quando backend/migrations estão prontos. */

/** UI de contas bancárias oculta — tabela `accounts` mantém-se na BD. */
export const ACCOUNTS_FEATURE_ENABLED = false;

/** Open Banking activo quando Edge Function configurada (credenciais só no servidor). */
export const OPEN_BANKING_ENABLED = true;

/** Coluna merchant em transacções (requer migration 20240624000000). */
export const MERCHANT_COLUMN_ENABLED = false;

/** Inventário manual só em desenvolvimento. */
export function isManualInventoryAllowed(): boolean {
  return __DEV__;
}
