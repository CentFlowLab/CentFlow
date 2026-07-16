/** Estado de consentimento de privacidade guardado localmente (SecureStore). */

export type PrivacyConsentRecord = {
  /** Versão do ecrã de consentimento aceite. */
  version: string;
  /** ISO timestamp da decisão. */
  decidedAt: string;
  /** Analytics de produto (eventos em Supabase) — opcional. */
  productAnalytics: boolean;
  /** Relatórios de crash (Sentry) — opcional. */
  crashReporting: boolean;
};

export const PRIVACY_CONSENT_VERSION = '1.0.0';

export type PrivacyConsentStatus = 'unknown' | 'decided';
