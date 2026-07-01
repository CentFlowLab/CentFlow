import { useEffect, useMemo, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCreateTransaction } from '@/hooks/queries/useTransactions';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { useAuth } from '@/lib/auth';
import { isCardCredit } from '@/lib/credit/credit-type.utils';
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
import { PayCreditCardModal } from './PayCreditCardModal';

/**
 * Verifica créditos com pagamento previsto para hoje (ou já passado).
 * Cartões → modal «Pagar cartão»; empréstimos → lembrete clássico.
 */
export function CreditPaymentReminderGate() {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? '';
  const { data } = useLiabilities();
  const credits = useMemo(() => data?.credits ?? [], [data?.credits]);
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

  async function handleLoanConfirm(amount: number) {
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

  if (current && isCardCredit(current.creditType)) {
    return (
      <PayCreditCardModal
        visible
        credit={current}
        onClose={handleClose}
      />
    );
  }

  return (
    <CreditPaymentReminderModal
      visible={Boolean(current)}
      credit={current}
      isSaving={createTransaction.isPending}
      onConfirm={handleLoanConfirm}
      onSnooze={handleSnooze}
      onClose={handleClose}
    />
  );
}
