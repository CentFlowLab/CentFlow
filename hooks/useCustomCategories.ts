import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth';
import {
  addCustomCategory as persistCustomCategory,
  loadCustomCategories,
} from '@/lib/data/custom-categories-storage';
import type { CashTransactionType } from '@/lib/domain/transaction.types';

/** Categorias personalizadas do utilizador (guardadas localmente, por tipo). */
export function useCustomCategories(type: CashTransactionType) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [customCategories, setCustomCategories] = useState<string[]>([]);

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
    async (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      await persistCustomCategory(userId, type, trimmed);
      setCustomCategories((prev) =>
        prev.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())
          ? prev
          : [trimmed, ...prev],
      );
    },
    [userId, type],
  );

  return { customCategories, addCustomCategory };
}
