import { useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  SettingsHero,
  SettingsScreenLayout,
} from '@/components/settings';
import { Button, Card, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useAssets } from '@/hooks/queries/useAssets';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { useCentFlowIntelligence } from '@/hooks/useCentFlowIntelligence';
import { exportUserDataJson } from '@/lib/export/export.service';
import { spacing } from '@/lib/theme';

export default function ExportDataScreen() {
  const [exporting, setExporting] = useState(false);
  const { data: transactions } = useTransactions('all');
  const { data: assets } = useAssets();
  const { data: liabilities } = useLiabilities();
  const { score } = useCentFlowIntelligence();
  const { showToast } = useToast();

  const credits = liabilities?.credits ?? assets?.credits ?? [];
  const subscriptions = liabilities?.subscriptions ?? assets?.subscriptions ?? [];

  const assetCount =
    (assets?.goals.length ?? 0) +
    (assets?.warranties.length ?? 0) +
    (assets?.inventory.length ?? 0);

  async function handleExport() {
    setExporting(true);

    try {
      await exportUserDataJson({
        exportedAt: new Date().toISOString(),
        version: 2,
        transactions: transactions ?? [],
        goals: assets?.goals ?? [],
        warranties: assets?.warranties ?? [],
        inventory: assets?.inventory ?? [],
        credits,
        subscriptions,
        centFlowScore: score,
      });
      showToast('Dados exportados com sucesso.', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Não foi possível exportar os dados.',
        'error',
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <SettingsScreenLayout title="Exportar dados" subtitle="Backup completo em JSON">
      <SettingsHero
        icon={{ ios: 'square.and.arrow.up', android: 'upload', web: 'upload' }}
        title="Os teus dados"
        description="Exporta movimentos, ativos, créditos, subscrições e CentFlow Score."
      />

      <Card variant="elevated" style={styles.card}>
        <Text variant="bodyMedium">
          {transactions?.length ?? 0} movimentos · {assetCount} ativos · {subscriptions.length}{' '}
          subscrições
        </Text>
        <Text variant="caption" color="textMuted">
          Ficheiro JSON v2 — inclui score e passivos recorrentes.
        </Text>
      </Card>

      <Button
        label={exporting ? 'A exportar...' : 'Exportar dados (JSON)'}
        onPress={handleExport}
        loading={exporting}
        fullWidth
      />
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
});
