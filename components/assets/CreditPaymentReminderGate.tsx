import { useEffect, useMemo, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCreateTransaction } from '@/hooks/queries/useTransactions';
import { useLiabilities, useSaveCredit } from '@/hooks/queries/useLiabilities';
import { useAuth } from '@/lib/auth';
import {
  addDaysIso,
  advanceMonthSameDayIso,
  firstDayOfNextMonthIso,
  isDueOrPast,
} from '@/lib/credit/credit-dates';
import {
  loadCreditReminderState,
  saveCreditReminderState,
  type CreditReminderState,
} from '@/lib/credit/credit-reminder-storage';
import { todayInputDate } from '@/lib/utils/format';

import { CreditPaymentReminderModal } from './CreditPaymentReminderModal';

/**
 * Verifica créditos com pagamento previsto para hoje (ou já passado) e pede
 * confirmação do débito ao utilizador. Montado no layout das tabs.
 */
export function CreditPaymentReminderGate() {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? '';
  const { data } = useLiabilities();
  const credits = useMemo(() => data?.credits ?? [], [data?.credits]);
  const saveCredit = useSaveCredit();
  const createTransaction = useCreateTransaction();
  const { showToast } = useToast();

  const [reminderState, setReminderState] = useState<CreditReminderState | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) {
      setReminderState(null);
      return;
    }
    let active = true;
    loadCreditReminderState(userId).then((state) => {
      if (active) setReminderState(state);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const current = useMemo(() => {
    if (!isAuthenticated || !reminderState) return null;
    return (
      credits.find((credit) => {
        if (!credit.nextPaymentDate || !isDueOrPast(credit.nextPaymentDate)) return false;
        if (dismissed.includes(credit.id)) return false;
        const entry = reminderState[credit.id];
        if (entry?.handledDate && entry.handledDate === credit.nextPaymentDate) return false;
        if (entry?.snoozedUntil && !isDueOrPast(entry.snoozedUntil)) return false;
        return true;
      }) ?? null
    );
  }, [isAuthenticated, reminderState, credits, dismissed]);

  async function persistState(next: CreditReminderState) {
    setReminderState(next);
    await saveCreditReminderState(userId, next);
  }

  async function handleConfirm(amount: number) {
    if (!current) return;
    const oldDate = current.nextPaymentDate;
    try {
      await createTransaction.mutateAsync({
        type: 'expense',
        amount,
        category: 'credit',
        description: current.name,
        date: todayInputDate(),
      });
      const newDate = oldDate ? advanceMonthSameDayIso(oldDate) : firstDayOfNextMonthIso();
      await saveCredit.mutateAsync({ ...current, nextPaymentDate: newDate });
      await persistState({ ...(reminderState ?? {}), [current.id]: { handledDate: oldDate } });
      setDismissed((prev) => [...prev, current.id]);
      showToast('Pagamento registado.', 'success');
    } catch {
      showToast('Não foi possível registar o pagamento.', 'error');
    }
  }

  async function handleSnooze() {
    if (!current) return;
    const until = addDaysIso(new Date(), 3);
    await persistState({
      ...(reminderState ?? {}),
      [current.id]: { ...(reminderState?.[current.id] ?? {}), snoozedUntil: until },
    });
    setDismissed((prev) => [...prev, current.id]);
  }

  function handleClose() {
    if (current) setDismissed((prev) => [...prev, current.id]);
  }

  return (
    <CreditPaymentReminderModal
      visible={Boolean(current)}
      credit={current}
      isSaving={createTransaction.isPending || saveCredit.isPending}
      onConfirm={handleConfirm}
      onSnooze={handleSnooze}
      onClose={handleClose}
    />
  );
}
