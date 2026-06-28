import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import {
  useAddToMerchantGroup,
  useCreateMerchantGroup,
  useMerchantGroups,
} from '@/hooks/queries/useMerchantGroups';
import { queryKeys } from '@/lib/api/keys';
import { useAuth } from '@/lib/auth';
import type { Transaction } from '@/lib/domain/transaction.types';
import { dismissMerchantSuggestion, isMerchantSuggestionDismissed } from '@/lib/merchants/dismissed-suggestions';
import { findSimilarMovements, suggestGroupName } from '@/lib/merchants/fuzzy-match';
import {
  subscribeMerchantSuggestionCheck,
  type MerchantSuggestionPayload,
} from '@/lib/merchants/suggestion-publisher';

import {
  MerchantGroupSuggestionSheet,
  type MerchantGroupSuggestionMode,
} from './MerchantGroupSuggestionSheet';

const SUGGESTION_DELAY_MS = 1500;

/**
 * Escuta novos movimentos guardados e sugere agrupamento fuzzy após o toast.
 */
export function MerchantGroupSuggestionGate() {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: groups = [] } = useMerchantGroups();
  const addToGroup = useAddToMerchantGroup();
  const createGroup = useCreateMerchantGroup();

  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<MerchantGroupSuggestionMode | null>(null);
  const dismissDescriptionsRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const analyze = useCallback(
    async (payload: MerchantSuggestionPayload) => {
      if (!userId || !payload.description.trim()) return;

      const transactions =
        queryClient.getQueryData<Transaction[]>(queryKeys.transactions({ filter: 'all' })) ?? [];

      const groupNameById = new Map(groups.map((g) => [g.id, g.name]));
      const candidates = transactions
        .filter((tx) => tx.type === 'expense')
        .map((tx) => ({
          id: tx.id,
          description: tx.description,
          merchantGroupId: tx.merchantGroupId,
        }));

      const matches = findSimilarMovements(payload.description, candidates, {
        excludeMovementId: payload.movementId,
        groupNameById,
      });

      if (matches.length === 0) return;

      const descriptions = [
        payload.description,
        ...matches.map((m) => m.description),
      ];

      if (await isMerchantSuggestionDismissed(userId, descriptions)) return;

      dismissDescriptionsRef.current = descriptions;

      const withGroup = matches.filter((m) => m.groupId);
      if (withGroup.length > 0) {
        const groupCounts = new Map<string, number>();
        for (const m of withGroup) {
          if (m.groupId) groupCounts.set(m.groupId, (groupCounts.get(m.groupId) ?? 0) + 1);
        }
        const dominantGroupId = [...groupCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
        const group = groups.find((g) => g.id === dominantGroupId);
        if (group) {
          setMode({
            kind: 'existing',
            group,
            newDescription: payload.description,
            movementId: payload.movementId,
          });
          setVisible(true);
          return;
        }
      }

      const ungrouped = matches.filter((m) => !m.groupId);
      if (ungrouped.length === 0) return;

      const suggestedName = suggestGroupName([
        payload.description,
        ...ungrouped.map((m) => m.description),
      ]);

      setMode({
        kind: 'create',
        newDescription: payload.description,
        movementId: payload.movementId,
        matches: ungrouped,
        suggestedName,
      });
      setVisible(true);
    },
    [groups, queryClient, userId],
  );

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    return subscribeMerchantSuggestionCheck((payload) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void analyze(payload);
      }, SUGGESTION_DELAY_MS);
    });
  }, [analyze, isAuthenticated, userId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function closeSheet() {
    setVisible(false);
    setMode(null);
  }

  async function handleDismiss() {
    if (userId && dismissDescriptionsRef.current.length > 0) {
      await dismissMerchantSuggestion(userId, dismissDescriptionsRef.current);
    }
    closeSheet();
  }

  async function handleConfirmExisting(groupId: string, alias: string, movementId: string) {
    try {
      const group = groups.find((g) => g.id === groupId);
      await addToGroup.mutateAsync({ groupId, alias, movementId });
      showToast(`Adicionado ao grupo ${group?.name ?? ''}`.trim(), 'success');
      closeSheet();
    } catch {
      showToast('Não foi possível adicionar ao grupo.', 'error');
    }
  }

  async function handleConfirmCreate(
    name: string,
    aliases: string[],
    movementIds: string[],
  ) {
    try {
      await createGroup.mutateAsync({ name, aliases, movementIds });
      showToast(`Grupo "${name}" criado com ${movementIds.length} movimentos`, 'success');
      closeSheet();
    } catch {
      showToast('Não foi possível criar o grupo.', 'error');
    }
  }

  return (
    <MerchantGroupSuggestionSheet
      visible={visible}
      mode={mode}
      loading={addToGroup.isPending || createGroup.isPending}
      onClose={closeSheet}
      onDismiss={() => void handleDismiss()}
      onConfirmExisting={(groupId, alias, movementId) =>
        void handleConfirmExisting(groupId, alias, movementId)
      }
      onConfirmCreate={(name, aliases, movementIds) =>
        void handleConfirmCreate(name, aliases, movementIds)
      }
    />
  );
}
