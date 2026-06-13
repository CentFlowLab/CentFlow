import { useState } from 'react';
import { Alert, Share, StyleSheet } from 'react-native';

import { SettingsHero, SettingsScreenLayout } from '@/components/settings/SettingsScreenLayout';
import { Button, Card, Text } from '@/components/ui';
import { useAssets } from '@/hooks/queries/useAssets';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { spacing } from '@/lib/theme';

export default function ExportDataScreen() {
  const [exporting, setExporting] = useState(false);
  const { data: transactions } = useTransactions('all');
  const { data: assets } = useAssets();

  async function handleExport() {
    setExporting(true);

    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        transactions: transactions ?? [],
        assets: assets ?? { goals: [], warranties: [], inventory: [] },
      };

      await Share.share({
        message: JSON.stringify(payload, null, 2),
        title: 'CentFlow — Exportação de dados',
      });
    } catch {
      Alert.alert('Exportação cancelada', 'Não foi possível partilhar os dados.');
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
          {transactions?.length ?? 0} movimentos ·{' '}
          {(assets?.goals.length ?? 0) +
            (assets?.warranties.length ?? 0) +
            (assets?.inventory.length ?? 0)}{' '}
          ativos
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
