import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { QuickExpenseSheet } from '@/components/movements';
import { colors } from '@/lib/theme';

/**
 * Rota do deep link `centflow://quick-expense`.
 * Abre o Quick Add por cima do ecrã actual e regressa ao fechar/guardar.
 */
export default function QuickExpenseRoute() {
  const [visible, setVisible] = useState(true);

  function handleClose() {
    if (!visible) return;
    setVisible(false);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <QuickExpenseSheet visible={visible} onClose={handleClose} />
    </View>
  );
}
