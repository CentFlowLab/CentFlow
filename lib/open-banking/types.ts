export type BankConnectionStatus = 'pending' | 'linked' | 'expired' | 'revoked' | 'error';

export type BankSyncStatus = 'never' | 'success' | 'failed';

export type BankConnectionAccount = {
  id: string;
  iban?: string | null;
  name?: string | null;
  currency: string;
  gocardlessAccountId: string;
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
  error?: string;
};
