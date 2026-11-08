import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, EmptyState, IconButton } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

/**
 * Ponto de entrada único do registo rápido (botão "+", atalhos e widgets no futuro).
 * O formulário chega na Fase 1.
 */
export function NewTransactionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.lg },
      ]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <IconButton
          icon="close"
          variant="filled"
          accessibilityLabel={t('common.close')}
          onPress={close}
        />
      </View>
      <View style={styles.body}>
        <EmptyState
          icon="flash-outline"
          title={t('newTransaction.title')}
          description={t('newTransaction.description')}>
          <Badge label={t('common.comingSoon')} tone="accent" />
        </EmptyState>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
});
