import { useEffect, useRef } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/keys';
import { formatDateShort } from '@/lib/utils/format';
import { moveExpiredWarrantiesToInventory } from '@/lib/warranties/expired-to-inventory';

/**
 * Na abertura da app, move garantias expiradas para o inventário
 * e mostra notificação in-app por cada transição.
 */
export function WarrantyInventorySyncEffect() {
  const ran = useRef(false);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void (async () => {
      try {
        const { moved } = await moveExpiredWarrantiesToInventory();
        if (moved.length === 0) return;

        await queryClient.invalidateQueries({ queryKey: queryKeys.assets });

        for (const item of moved.slice(0, 3)) {
          showToast(
            `"${item.productName}" passou para o Inventário. A garantia terminou em ${formatDateShort(item.expiredAt)}.`,
            'info',
          );
        }

        if (moved.length > 3) {
          showToast(
            `Mais ${moved.length - 3} garantia(s) expirada(s) foram movidas para o Inventário.`,
            'info',
          );
        }
      } catch {
        // silencioso — não bloquear arranque
      }
    })();
  }, [queryClient, showToast]);

  return null;
}
