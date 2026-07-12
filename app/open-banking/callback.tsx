import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthLoadingScreen } from '@/components/auth';
import { Button, Card, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import {
  useBankConnections,
  useFinalizeBankLink,
} from '@/hooks/queries/useBankConnections';
import { spacing, useThemedStyles } from '@/lib/theme';
import type { ThemeColors } from '@/lib/theme/types';

export default function OpenBankingCallbackScreen() {
  const params = useLocalSearchParams<{ requisition_id?: string; ref?: string }>();
  const { data: connections } = useBankConnections();
  const finalize = useFinalizeBankLink();
  const { showToast } = useToast();
  const styles = useThemedStyles(createStyles);
  const [error, setError] = useState<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;

    const requisitionId =
      params.requisition_id ??
      connections?.find((item) => item.status === 'pending')?.requisitionId;

    if (!requisitionId) return;

    handledRef.current = true;

    void finalize
      .mutateAsync(requisitionId)
      .then((result) => {
        if (result.sync?.imported) {
          showToast(`${result.sync.imported} movimentos importados`, 'success');
        } else if (result.syncError) {
          showToast('Conta ligada — sincronização parcial', 'info');
        } else {
          showToast('Conta bancária ligada', 'success');
        }
        router.replace('/settings/bank-connections');
      })
      .catch((callbackError) => {
        setError(callbackError instanceof Error ? callbackError.message : 'Falha no callback');
      });
  }, [connections, finalize, params.requisition_id, showToast]);

  if (error) {
    return (
      <View style={styles.container}>
        <Card variant="outlined" style={styles.card}>
          <Text variant="h3">Ligação bancária</Text>
          <Text variant="body" color="textSecondary">
            {error}
          </Text>
          <Button label="Ir às ligações" onPress={() => router.replace('/settings/bank-connections')} />
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AuthLoadingScreen message="A confirmar ligação bancária..." />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      gap: spacing.md,
    },
  });
}
