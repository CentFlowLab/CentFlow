import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  addCustomCategory as persistCustomCategory,
  deleteCustomCategory as persistDeleteCustomCategory,
  loadCustomCategories,
  updateCustomCategory as persistUpdateCustomCategory,
  type CustomCategory,
} from '@/lib/data/custom-categories-storage';
import {
  countTransactionsByCategory,
  reassignTransactionsCategory,
  renameTransactionsCategory,
} from '@/lib/api/services/transaction.service';
import { invalidateTransactionQueries } from '@/lib/api/invalidate-queries';
import { useAuth } from '@/lib/auth';
import type { CashTransactionType } from '@/lib/domain/transaction.types';

/** Categorias personalizadas do utilizador (local + sync de movimentos no Supabase). */
export function useCustomCategories(type: CashTransactionType) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);

  const reload = useCallback(async () => {
    const list = await loadCustomCategories(userId, type);
    setCustomCategories(list);
  }, [userId, type]);

  useEffect(() => {
    let active = true;
    loadCustomCategories(userId, type).then((list) => {
      if (active) setCustomCategories(list);
    });
    return () => {
      active = false;
    };
  }, [userId, type]);

  const addCustomCategory = useCallback(
    async (label: string, options?: { emoji?: string; color?: string; emojiManual?: boolean }) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      const created = await persistCustomCategory(userId, type, trimmed, options);
      setCustomCategories((prev) => {
        if (prev.some((existing) => existing.name.toLowerCase() === trimmed.toLowerCase())) {
          return prev;
        }
        return [created, ...prev];
      });
      return created;
    },
    [userId, type],
  );

  const updateCustomCategory = useCallback(
    async (
      oldName: string,
      patch: { name: string; emoji: string; color: string; emojiManual?: boolean },
    ) => {
      const updated = await persistUpdateCustomCategory(userId, type, oldName, patch);
      if (oldName.toLowerCase() !== patch.name.trim().toLowerCase()) {
        await renameTransactionsCategory(oldName, patch.name.trim());
        invalidateTransactionQueries(queryClient);
      }
      setCustomCategories((prev) =>
        prev.map((item) => (item.name.toLowerCase() === oldName.toLowerCase() ? updated : item)),
      );
      return updated;
    },
    [userId, type, queryClient],
  );

  const deleteCustomCategory = useCallback(
    async (name: string) => {
      await reassignTransactionsCategory(name, 'other');
      await persistDeleteCustomCategory(userId, type, name);
      invalidateTransactionQueries(queryClient);
      setCustomCategories((prev) =>
        prev.filter((item) => item.name.toLowerCase() !== name.toLowerCase()),
      );
    },
    [userId, type, queryClient],
  );

  const getUsageCount = useCallback(async (name: string) => {
    return countTransactionsByCategory(name);
  }, []);

  return {
    customCategories,
    addCustomCategory,
    updateCustomCategory,
    deleteCustomCategory,
    getUsageCount,
    reload,
  };
}

export type { CustomCategory };
