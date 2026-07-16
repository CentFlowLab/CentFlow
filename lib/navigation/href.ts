import type { RelativePathString } from 'expo-router';

/** Rotas da app — RelativePathString para compatibilidade com typed routes Expo. */
export const AppHref = {
  creditos: '/(tabs)/creditos',
  creditosNew: '/(tabs)/creditos?action=new-credit',
  movimentos: '/(tabs)/movimentos',
  movimentosSubscricoes: '/(tabs)/movimentos?view=subscricoes',
  ativos: '/(tabs)/ativos',
  ativosGarantias: '/(tabs)/ativos?tab=garantias',
  ativosObjetivos: '/(tabs)/ativos?tab=objetivos',
  calendar: '/calendar',
  assistant: '/assistant',
  bankConnections: '/settings/bank-connections',
  benchmarkConsent: '/settings/benchmark-consent',
  legalPrivacy: '/legal/privacy',
  legalTerms: '/legal/terms',
  deleteAccount: '/settings/delete-account',
  exportData: '/settings/export-data',
  exportPdf: '/settings/export-pdf',
  privacySettings: '/settings/privacy',
} as const;

export type AppHrefKey = keyof typeof AppHref;

export function appHref(key: AppHrefKey): RelativePathString {
  return AppHref[key] as RelativePathString;
}
