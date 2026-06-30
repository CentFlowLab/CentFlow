/**
 * Flags de produto — desactivar features cujo schema ainda não está em produção.
 * Contas bancárias: migration 20240625000000 — só activar após db push.
 */
export const ACCOUNTS_FEATURE_ENABLED = false;

/** Campo merchant em transactions — migration 20240624000000 — só activar após db push. */
export const MERCHANT_COLUMN_ENABLED = false;

/** Inventário manual — só em dev/mock; produção usa garantias/recibos. */
export function isManualInventoryAllowed(): boolean {
  return __DEV__;
}
