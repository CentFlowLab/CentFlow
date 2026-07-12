import { fetchUserPreferences } from '@/lib/preferences/preferences.service';
import { getSupabaseClient, isSupabaseEnabled } from '@/lib/supabase';
import {
  ensureLocalNotificationPermissions,
  presentImmediateLocalNotification,
} from '@/lib/notifications/local-notifications';
import {
  buildConsentExpiryMessage,
  buildImportDigestMessage,
} from '@/lib/notifications/open-banking-sync-messages';

export type OpenBankingSyncDigest = {
  id: string;
  kind: 'import' | 'consent_expiry';
  importedCount: number;
  lowConfidenceCount: number;
  connectionId: string | null;
  createdAt: string;
};

function daysUntil(isoDate: string): number {
  const target = new Date(isoDate).getTime();
  return Math.ceil((target - Date.now()) / (24 * 60 * 60 * 1000));
}

async function fetchPendingDigests(): Promise<OpenBankingSyncDigest[]> {
  if (!isSupabaseEnabled()) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('open_banking_sync_digests')
    .select('id, kind, imported_count, low_confidence_count, connection_id, created_at')
    .is('notified_at', null)
    .order('created_at', { ascending: true })
    .limit(10);

  if (error || !data) return [];

  return data.map((row) => ({
    id: String(row.id),
    kind: row.kind as OpenBankingSyncDigest['kind'],
    importedCount: Number(row.imported_count ?? 0),
    lowConfidenceCount: Number(row.low_confidence_count ?? 0),
    connectionId: (row.connection_id as string | null) ?? null,
    createdAt: String(row.created_at),
  }));
}

async function markDigestNotified(digestId: string): Promise<void> {
  if (!isSupabaseEnabled()) return;

  const supabase = getSupabaseClient();
  await supabase
    .from('open_banking_sync_digests')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', digestId);
}

/**
 * Apresenta push local para digests de sync automático e avisos de consentimento.
 */
export async function checkOpenBankingSyncDigests(
  connectionsById: Map<string, { institutionName: string; consentExpiresAt?: string | null }>,
): Promise<void> {
  try {
    if (!isSupabaseEnabled()) return;

    const supabase = getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const preferences = await fetchUserPreferences(user.id);
    if (!preferences.pushNotifications) return;

    const digests = await fetchPendingDigests();
    if (digests.length === 0) return;

    const granted = await ensureLocalNotificationPermissions();
    if (!granted) return;

    for (const digest of digests) {
      if (digest.kind === 'import' && digest.importedCount > 0) {
        await presentImmediateLocalNotification(
          'Movimentos importados',
          buildImportDigestMessage(digest.importedCount, digest.lowConfidenceCount),
        );
        await markDigestNotified(digest.id);
        continue;
      }

      if (digest.kind === 'consent_expiry' && digest.connectionId) {
        const connection = connectionsById.get(digest.connectionId);
        if (!connection) {
          await markDigestNotified(digest.id);
          continue;
        }

        const daysLeft = connection.consentExpiresAt
          ? daysUntil(connection.consentExpiresAt)
          : 7;

        await presentImmediateLocalNotification(
          'Consentimento bancário',
          buildConsentExpiryMessage(connection.institutionName, daysLeft),
        );
        await markDigestNotified(digest.id);
      }
    }
  } catch {
    // Efeito secundário — falhas silenciosas.
  }
}
