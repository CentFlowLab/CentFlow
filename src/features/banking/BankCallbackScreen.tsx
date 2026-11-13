import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, FormScreen, Text } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

import { useAuth } from '../account/AuthProvider';
import { closeModal } from '../finance/navigation';
import { finishBankLink, type BankClientError } from './open-banking-client';

/**
 * Regresso da autorização no banco (miven://bank-callback ou /app/bank-callback na web).
 * O código só vale uma vez e só para quem pediu a ligação (o servidor confirma o `state`).
 */
export function BankCallbackScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { client } = useAuth();
  const params = useLocalSearchParams<{ code?: string; state?: string; error?: string }>();
  const [error, setError] = useState<BankClientError | 'cancelled' | null>(
    params.error ? 'cancelled' : !params.code || !params.state ? 'invalid' : null,
  );
  const started = useRef(false);

  useEffect(() => {
    if (!client || !params.code || !params.state || params.error || started.current) return;
    started.current = true;
    void finishBankLink(client, params.code, params.state).then((result) => {
      if (result.ok) router.replace('/integrations/banks' as Href);
      else setError(result.error);
    });
  }, [client, params.code, params.state, params.error]);

  return (
    <FormScreen
      title={t('banking.title')}
      closeLabel={t('common.close')}
      onClose={() => closeModal('/integrations/banks')}>
      <View style={styles.body}>
        {error ? (
          <>
            <Text variant="title3" accessibilityRole="header">
              {t('banking.callback.failed')}
            </Text>
            <Text variant="callout" tone="secondary" accessibilityLiveRegion="polite">
              {t(`banking.errors.${error}`)}
            </Text>
            <Button
              label={t('banking.callback.back')}
              onPress={() => router.replace('/integrations/banks' as Href)}
            />
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} accessibilityLabel={t('common.loading')} />
            <Text variant="callout" tone="secondary" style={styles.center}>
              {t('banking.callback.title')}
            </Text>
          </>
        )}
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg },
  center: { textAlign: 'center' },
});
