/** Flags de produto — activar funcionalidades quando backend/migrations estão prontos. */

export const ACCOUNTS_FEATURE_ENABLED = true;

/** Coluna merchant em transacções (requer migration 20240624000000). */
export const MERCHANT_COLUMN_ENABLED = false;

/** Inventário manual só em desenvolvimento. */
export function isManualInventoryAllowed(): boolean {
  return __DEV__;
}
