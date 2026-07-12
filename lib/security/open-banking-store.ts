import { fetchBankConnections, revokeBankConnection } from '@/lib/open-banking/gocardless.service';

import type { OpenBankingConsentRecord } from './openBankingPrep';

/** Consentimentos via Supabase — nunca tokens bancários em storage local. */
export function prepareOpenBankingConsentStore(): {
  listConsents: () => Promise<OpenBankingConsentRecord[]>;
  revokeConsent: (consentId: string) => Promise<void>;
} {
  return {
    async listConsents() {
      const connections = await fetchBankConnections();
      return connections.map((connection) => ({
        consentId: connection.id,
        institutionId: connection.institutionId,
        institutionName: connection.institutionName,
        scopes: ['accounts', 'transactions'],
        grantedAt: connection.createdAt,
        expiresAt: undefined,
        revokedAt: connection.status === 'revoked' ? new Date().toISOString() : undefined,
      }));
    },
    async revokeConsent(consentId: string) {
      await revokeBankConnection(consentId);
    },
  };
}

export type { OpenBankingConsentRecord } from './openBankingPrep';
