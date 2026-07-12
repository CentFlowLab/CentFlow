import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';

import { useBankConnections } from '@/hooks/queries/useBankConnections';
import { useAuth } from '@/lib/auth';
import { scheduleFinancialRecalculation } from '@/lib/domain/financial/engine.runner';
import { checkOpenBankingSyncDigests } from '@/lib/notifications/open-banking-sync-alert.service';

/**
 * Após sync automático (cron):
 * - notifica importações e avisos de consentimento
 * - dispara motor financeiro quando há novas transacções
 */
export function OpenBankingSyncNotificationGate() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const { data: connections } = useBankConnections();
  const lastAutoSyncRef = useRef<string | null>(null);

  const connectionsById = useMemo(() => {
    const map = new Map<string, { institutionName: string; consentExpiresAt?: string | null }>();
    for (const connection of connections ?? []) {
      map.set(connection.id, {
        institutionName: connection.institutionName,
        consentExpiresAt: connection.consentExpiresAt,
      });
    }
    return map;
  }, [connections]);

  const autoSyncSignature = useMemo(
    () =>
      (connections ?? [])
        .map((item) => `${item.id}:${item.lastAutoSyncAt ?? ''}:${item.lastSyncStatus}`)
        .join('|'),
    [connections],
  );

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    void checkOpenBankingSyncDigests(connectionsById);
  }, [autoSyncSignature, connectionsById, isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !autoSyncSignature) return;
    if (autoSyncSignature === lastAutoSyncRef.current) return;

    const previous = lastAutoSyncRef.current;
    lastAutoSyncRef.current = autoSyncSignature;

    if (previous !== null) {
      scheduleFinancialRecalculation(queryClient, user.id, { type: 'open_banking_import' });
    }
  }, [autoSyncSignature, isAuthenticated, queryClient, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void checkOpenBankingSyncDigests(connectionsById);
      }
    });

    return () => subscription.remove();
  }, [connectionsById, isAuthenticated, user?.id]);

  return null;
}
