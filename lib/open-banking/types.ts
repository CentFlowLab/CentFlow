export type BankConnectionStatus = 'pending' | 'linked' | 'expired' | 'revoked' | 'error';

export type BankSyncStatus = 'never' | 'success' | 'failed';

export type BankConnectionAccount = {
  id: string;
  iban?: string | null;
  name?: string | null;
  currency: string;
  gocardlessAccountId: string;
  lastAutoSyncAt?: string | null;
  lastAutoSyncStatus?: 'success' | 'failed' | 'skipped' | null;
};

export type BankConnection = {
  id: string;
  institutionId: string;
  institutionName: string;
  requisitionId: string;
  status: BankConnectionStatus;
  lastSyncAt?: string | null;
  lastSyncStatus: BankSyncStatus;
  lastSyncError?: string | null;
  lastAutoSyncAt?: string | null;
  lastSyncSource?: 'manual' | 'auto' | null;
  consentExpiresAt?: string | null;
  createdAt: string;
  accounts: BankConnectionAccount[];
};

export type GoCardlessInstitution = {
  id: string;
  name: string;
  bic?: string;
  logo?: string;
};

export type CreateBankLinkResult = {
  connectionId: string;
  requisitionId: string;
  link?: string;
};

export type SyncConnectionResult = {
  ok: boolean;
  imported?: number;
  skipped?: number;
  lowConfidenceCount?: number;
  error?: string;
};
