import { useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  SettingsHero,
  SettingsScreenLayout,
} from '@/components/settings';
import { Button, Card, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useAssets } from '@/hooks/queries/useAssets';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { exportUserDataJson } from '@/lib/export/export.service';
import { spacing } from '@/lib/theme';

export default function ExportDataScreen() {
  const [exporting, setExporting] = useState(false);
  const { data: transactions } = useTransactions('all');
  const { data: assets } = useAssets();
  const { showToast } = useToast();

  const assetCount =
    (assets?.goals.length ?? 0) +
    (assets?.warranties.length ?? 0) +
    (assets?.inventory.length ?? 0);

  async function handleExport() {
    setExporting(true);

    try {
      await exportUserDataJson(transactions ?? [], assets ?? {
        goals: [],
        warranties: [],
        inventory: [],
        credits: [],
        subscriptions: [],
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
    <SettingsScreenLayout title="Exportar dados" subtitle="Backup em formato JSON">
      <SettingsHero
        icon={{ ios: 'square.and.arrow.up', android: 'upload', web: 'upload' }}
        title="Os teus dados"
        description="Exporta movimentos, objetivos, garantias e inventário."
      />

      <Card variant="elevated" style={styles.card}>
        <Text variant="bodyMedium">
          {transactions?.length ?? 0} movimentos · {assetCount} ativos
        </Text>
        <Text variant="caption" color="textMuted">
          Ficheiro JSON legível — útil para backup ou migração futura.
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
