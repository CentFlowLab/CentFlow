import { useCallback, useMemo, useState } from 'react';

import type { QuickAddActionId } from '@/components/layout/QuickAddMenuSheet';
import { getRankedQuickAddActions } from '@/lib/onboarding/quick-actions';
import type { OnboardingAnswers } from '@/lib/onboarding/types';
import {
  getQuickAddActionLabel,
  getQuickAddContextLabel,
  type QuickAddScreenContext,
} from '@/lib/navigation/quick-add-context';

import { useQuickAddActions, type QuickAddHandlers } from './useQuickAddActions';

export function useContextualQuickAdd(
  context: QuickAddScreenContext,
  handlers: QuickAddHandlers = {},
  onboardingAnswers?: OnboardingAnswers | null,
) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const actions = useMemo(
    () => getRankedQuickAddActions(context, onboardingAnswers),
    [context, onboardingAnswers],
  );
  const onSelect = useQuickAddActions(handlers);

  const handlePress = useCallback(() => {
    if (actions.length === 1) {
      onSelect(actions[0]!);
      return;
    }
    setSheetVisible(true);
  }, [actions, onSelect]);

  const accessibilityLabel =
    actions.length === 1
      ? getQuickAddActionLabel(actions[0]!)
      : getQuickAddContextLabel(context);

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
