/**
 * Preparação para open banking — nenhum token bancário em storage local.
 * Consentimentos e revogações passam sempre por backend seguro.
 */
export type OpenBankingConsentRecord = {
  consentId: string;
  institutionId: string;
  institutionName: string;
  scopes: string[];
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
};
