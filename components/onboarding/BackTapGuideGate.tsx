import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth';
import { hasSeenBackTapGuide, markBackTapGuideShown } from '@/lib/onboarding/back-tap-guide';

import { BackTapGuide } from './BackTapGuide';

/**
 * Mostra o guia de Back Tap uma única vez, na primeira entrada na app após o
 * onboarding (as tabs só renderizam depois do onboarding estar completo).
 */
export function BackTapGuideGate() {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? '';
  const { showToast } = useToast();
  const [visible, setVisible] = useState(false);

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
    await dismiss();
    router.push('/quick-expense');
    showToast('Perfeito, está a funcionar!', 'success');
  }

  return <BackTapGuide visible={visible} onTestNow={handleTestNow} onLater={dismiss} />;
}
