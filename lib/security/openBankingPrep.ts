/**
 * Preparação para open banking — nenhum token bancário em storage local.
 * Consentimentos e revogações passarão sempre por backend seguro.
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

/** Placeholder — persistência futura via API, não SecureStore/AsyncStorage. */
export function prepareOpenBankingConsentStore(): {
  listConsents: () => Promise<OpenBankingConsentRecord[]>;
  revokeConsent: (consentId: string) => Promise<void>;
} {
  return {
    async listConsents() {
      return [];
    },
    async revokeConsent(_consentId: string) {
      // Futuro: POST /open-banking/consents/:id/revoke
    },
  };
}
