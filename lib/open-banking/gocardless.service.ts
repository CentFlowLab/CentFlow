import * as Linking from 'expo-linking';

import { logAppError } from '@/lib/diagnostics';

import { getSupabaseClient } from '@/lib/supabase/client';

import type {
  BankConnection,
  BankConnectionAccount,
  CreateBankLinkResult,
  GoCardlessInstitution,
  SyncConnectionResult,
} from './types';

const GOCARDLESS_FUNCTION = 'gocardless';

function mapConnection(row: Record<string, unknown>): BankConnection {
  const accounts = (row.accounts as Record<string, unknown>[] | undefined) ?? [];
  return {
    id: String(row.id),
    institutionId: String(row.institution_id),
    institutionName: String(row.institution_name),
    requisitionId: String(row.requisition_id),
    status: row.status as BankConnection['status'],
    lastSyncAt: (row.last_sync_at as string | null) ?? null,
    lastSyncStatus: (row.last_sync_status as BankConnection['lastSyncStatus']) ?? 'never',
    lastSyncError: (row.last_sync_error as string | null) ?? null,
    lastAutoSyncAt: (row.last_auto_sync_at as string | null) ?? null,
    lastSyncSource: (row.last_sync_source as BankConnection['lastSyncSource']) ?? null,
    consentExpiresAt: (row.consent_expires_at as string | null) ?? null,
    createdAt: String(row.created_at),
    accounts: accounts.map((account) => ({
      id: String(account.id),
      iban: (account.iban as string | null) ?? null,
      name: (account.name as string | null) ?? null,
      currency: String(account.currency ?? 'EUR'),
      gocardlessAccountId: String(account.gocardless_account_id),
      lastAutoSyncAt: (account.last_auto_sync_at as string | null) ?? null,
      lastAutoSyncStatus:
        (account.last_auto_sync_status as BankConnectionAccount['lastAutoSyncStatus']) ?? null,
    })),
  };
}

async function invokeGoCardless<T>(body: Record<string, unknown>): Promise<T> {
  const action = String(body.action ?? 'unknown');
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke(GOCARDLESS_FUNCTION, { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(String(data.error));
    return data as T;
  } catch (error) {
    logAppError('gocardless', error, {
      component: 'open-banking',
      action: `gocardless:${action}`,
      integration: 'gocardless',
    });
    throw error instanceof Error ? error : new Error('Falha Open Banking');
  }
}

export function getOpenBankingRedirectUrl(): string {
  return Linking.createURL('open-banking/callback');
}

export async function fetchSupportedBanks(): Promise<GoCardlessInstitution[]> {
  const data = await invokeGoCardless<{ institutions: GoCardlessInstitution[] }>({
    action: 'list_institutions',
  });
  return data.institutions ?? [];
}

export async function createBankLink(institutionId: string): Promise<CreateBankLinkResult> {
  return invokeGoCardless<CreateBankLinkResult>({
    action: 'create_link',
    institutionId,
    redirectUrl: getOpenBankingRedirectUrl(),
  });
}

export async function finalizeBankLink(requisitionId: string): Promise<{
  status: string;
  connectionId: string;
  sync?: { imported: number; skipped: number };
  syncError?: string;
}> {
  return invokeGoCardless({
    action: 'finalize_link',
    requisitionId,
  });
}

export async function fetchBankConnections(): Promise<BankConnection[]> {
  const data = await invokeGoCardless<{ connections: Record<string, unknown>[] }>({
    action: 'list_connections',
  });
  return (data.connections ?? []).map(mapConnection);
}

export async function revokeBankConnection(connectionId: string): Promise<void> {
  await invokeGoCardless({ action: 'revoke_connection', connectionId });
}

export async function syncBankConnection(connectionId: string): Promise<SyncConnectionResult> {
  try {
    const data = await invokeGoCardless<{ ok: boolean; imported?: number; skipped?: number }>({
      action: 'sync_connection',
      connectionId,
    });
    return { ok: true, imported: data.imported, skipped: data.skipped };
  } catch (error) {
    logAppError('gocardless-sync', error, {
      component: 'open-banking',
      action: 'sync_connection',
      connectionId,
    });
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Falha na sincronização',
    };
  }
}
