import { isValidStartDay } from './financial-month';

/**
 * Definições da conta sincronizadas entre aparelhos (ADR-079), na fila normal de sincronização.
 * Uma linha por chave, com o mesmo id em todos os aparelhos: duas escolhas feitas sem rede chegam
 * ao servidor como versões do mesmo registo (o servidor decide a ordem; uma divergência fica em
 * conflito para a pessoa escolher, nunca é substituída em silêncio).
 */
export const ACCOUNT_SETTINGS = ['financial_month_start_day'] as const;
export type AccountSetting = (typeof ACCOUNT_SETTINGS)[number];

export const ACCOUNT_SETTING_IDS: Readonly<Record<AccountSetting, string>> = {
  financial_month_start_day: '6f1d0c3e-5b1a-4c7e-9a10-0000000000f1',
};

/** Início do mês financeiro guardado: inválido ou ausente → 1 (mês civil). */
export function parseStartDaySetting(value: string | null | undefined): number {
  if (value == null) return 1;
  const day = Number(value);
  return isValidStartDay(day) ? day : 1;
}
