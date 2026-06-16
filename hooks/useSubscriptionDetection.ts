import { useEffect, useMemo, useState } from 'react';

import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { useTransactions } from '@/hooks/queries/useTransactions';
import {
  detectSubscriptionsFromTransactions,
  type DetectedSubscription,
} from '@/lib/subscriptions/detect-subscriptions';
import {
  dismissSubscriptionDetection,
  loadDismissedSubscriptionDetections,
} from '@/lib/storage/pending-subscriptions.storage';
import { useAuth } from '@/lib/auth';

export function useSubscriptionDetection() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { data: transactions = [] } = useTransactions('all');
  const { data: liabilities } = useLiabilities();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [activeDetection, setActiveDetection] = useState<DetectedSubscription | null>(null);

  useEffect(() => {
    if (!userId) return;
    void loadDismissedSubscriptionDetections(userId).then(setDismissed);
  }, [userId]);

  const pending = useMemo(
    () =>
      detectSubscriptionsFromTransactions(
        transactions,
        liabilities?.subscriptions ?? [],
        dismissed,
      ),
    [transactions, liabilities?.subscriptions, dismissed],
  );

  useEffect(() => {
    if (activeDetection) return;
    if (pending.length === 0) return;
    setActiveDetection(pending[0]);
  }, [pending, activeDetection]);

  async function dismissCurrent() {
    if (!userId || !activeDetection) return;
    const next = await dismissSubscriptionDetection(userId, activeDetection.id);
    setDismissed(next);
    setActiveDetection(null);
  }

  function confirmHandled() {
    setActiveDetection(null);
  }

  return {
    activeDetection,
    pendingCount: pending.length,
    dismissCurrent,
    confirmHandled,
  };
}
