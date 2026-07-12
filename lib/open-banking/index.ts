/**
 * Open Banking — delegação ao backend via Edge Functions (sem tokens no cliente).
 */
export {
  fetchBankConnections,
  fetchSupportedBanks,
  createBankLink,
  finalizeBankLink,
  revokeBankConnection,
  syncBankConnection,
  getOpenBankingRedirectUrl,
} from './gocardless.service';

export type {
  BankConnection,
  BankConnectionAccount,
  BankConnectionStatus,
  BankSyncStatus,
  GoCardlessInstitution,
} from './types';
