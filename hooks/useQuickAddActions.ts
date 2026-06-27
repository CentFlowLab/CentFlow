import { router } from 'expo-router';

import { useToast } from '@/components/ui/Toast';
import type { QuickAddActionId } from '@/components/layout/QuickAddMenuSheet';

export type QuickAddHandlers = {
  onMovement?: () => void;
  onSubscription?: () => void;
  onProduct?: () => void;
  onGoal?: () => void;
  onCredit?: () => void;
  onAsset?: () => void;
  onWarranty?: () => void;
};

export function useQuickAddActions(handlers: QuickAddHandlers = {}) {
  const { showToast } = useToast();

  return (action: QuickAddActionId) => {
    switch (action) {
      case 'movement':
        if (handlers.onMovement) {
          handlers.onMovement();
        } else {
          router.push('/(tabs)/movimentos?action=new-movement');
        }
        break;
      case 'subscription':
        if (handlers.onSubscription) {
          handlers.onSubscription();
        } else {
          router.push('/(tabs)/movimentos?view=subscricoes&action=new-subscription');
        }
        break;
      case 'product':
        if (handlers.onProduct) {
          handlers.onProduct();
        } else {
          router.push('/(tabs)/precos');
          showToast('Regista movimentos para monitorizar preços.', 'info');
        }
        break;
      case 'goal':
        if (handlers.onGoal) {
          handlers.onGoal();
        } else {
          router.push('/(tabs)/ativos?action=new-goal');
        }
        break;
      case 'credit':
        if (handlers.onCredit) {
          handlers.onCredit();
        } else {
          router.push('/(tabs)/precos');
        }
        break;
      case 'asset':
        if (handlers.onAsset) {
          handlers.onAsset();
        } else {
          router.push('/(tabs)/ativos?action=new-asset');
        }
        break;
      case 'warranty':
        if (handlers.onWarranty) {
          handlers.onWarranty();
        } else {
          router.push('/(tabs)/ativos?action=new-warranty');
        }
        break;
    }
  };
}
