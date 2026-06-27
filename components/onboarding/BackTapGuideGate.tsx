import { useEffect, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCreateTransaction } from '@/hooks/queries/useTransactions';
import { useAuth } from '@/lib/auth';
import {
  mapCategoryKey,
  parseQuickExpenseUrl,
} from '@/lib/quick-expense/handle-quick-expense-link';
import { hasSeenBackTapGuide, markBackTapGuideShown } from '@/lib/onboarding/back-tap-guide';
import { formatCurrency, todayInputDate } from '@/lib/utils/format';

import { BackTapGuide } from './BackTapGuide';

const TEST_URL = 'centflow://quick-expense?amount=1&category=other&note=Teste';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

/**
 * Mostra o guia de Back Tap uma única vez, na primeira entrada na app após o
 * onboarding (as tabs só renderizam depois do onboarding estar completo).
 */
export function BackTapGuideGate() {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? '';
  const { showToast } = useToast();
  const createMutation = useCreateTransaction();
  const [visible, setVisible] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    let active = true;
    hasSeenBackTapGuide(userId).then((seen) => {
      if (active && !seen) setVisible(true);
    });
    return () => {
      active = false;
    };
  }, [isAuthenticated, userId]);

  async function dismiss() {
    setVisible(false);
    if (userId) await markBackTapGuideShown(userId);
  }

  async function handleTestNow() {
    const params = parseQuickExpenseUrl(TEST_URL);
    if (!params) {
      setTestStatus('error');
      return;
    }
    setTestStatus('testing');
    try {
      await createMutation.mutateAsync({
        type: 'expense',
        amount: params.amount,
        category: mapCategoryKey(params.category),
        description: params.note,
        date: todayInputDate(),
      });
      setTestStatus('success');
      showToast(`\u2212${formatCurrency(params.amount)} guardado`, 'success');
      if (userId) await markBackTapGuideShown(userId);
    } catch {
      setTestStatus('error');
      showToast('Não foi possível guardar. Tenta novamente.', 'error');
    }
  }

  return (
    <BackTapGuide
      visible={visible}
      onTestNow={handleTestNow}
      onLater={dismiss}
      testStatus={testStatus}
    />
  );
}
