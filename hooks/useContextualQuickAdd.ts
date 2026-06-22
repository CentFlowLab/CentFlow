import { useCallback, useMemo, useState } from 'react';

import type { QuickAddActionId } from '@/components/layout/QuickAddMenuSheet';
import {
  getContextualQuickAddActions,
  getQuickAddContextLabel,
  type QuickAddScreenContext,
} from '@/lib/navigation/quick-add-context';

import { useQuickAddActions, type QuickAddHandlers } from './useQuickAddActions';

export function useContextualQuickAdd(
  context: QuickAddScreenContext,
  handlers: QuickAddHandlers = {},
) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const actions = useMemo(() => getContextualQuickAddActions(context), [context]);
  const onSelect = useQuickAddActions(handlers);

  const handlePress = useCallback(() => {
    if (actions.length === 1) {
      onSelect(actions[0]!);
      return;
    }
    setSheetVisible(true);
  }, [actions, onSelect]);

  const accessibilityLabel =
    actions.length === 1 ? getQuickAddContextLabel(context) : 'Adicionar';

  return {
    actions,
    accessibilityLabel,
    sheetVisible,
    setSheetVisible,
    onSelect,
    handlePress,
  };
}

export type { QuickAddActionId };
