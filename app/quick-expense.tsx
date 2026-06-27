import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { QuickExpenseSheet } from '@/components/movements';
import { colors } from '@/lib/theme';

/**
 * Rota do deep link `centflow://quick-expense`.
 *
 * - Sem parâmetros: abre o Gasto rápido (formulário) por cima do ecrã actual.
 * - Com `amount` (ex.: `?amount=25&category=food`): a despesa é guardada
 *   automaticamente pelo QuickExpenseLinkHandler — aqui apenas evitamos mostrar
 *   qualquer formulário e regressamos imediatamente.
 */
export default function QuickExpenseRoute() {
  const params = useLocalSearchParams<{ amount?: string }>();
  const hasParams = typeof params.amount === 'string' && params.amount.length > 0;
  const [visible, setVisible] = useState(!hasParams);

  useEffect(() => {
    if (!hasParams) return;
    closeRoute();
  }, [hasParams]);

  function closeRoute() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }

  function handleClose() {
    if (!visible) return;
    setVisible(false);
    closeRoute();
  }

  if (hasParams) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <QuickExpenseSheet visible={visible} onClose={handleClose} />
    </View>
  );
}
