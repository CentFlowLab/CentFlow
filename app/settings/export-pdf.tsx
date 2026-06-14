import { useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  SettingsHero,
  SettingsScreenLayout,
} from '@/components/settings';
import { Button, Card, LoadingSpinner, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useAssets } from '@/hooks/queries/useAssets';
import { useDashboardData } from '@/hooks/queries/useDashboardData';
import { useFinancialProfile } from '@/hooks/queries/useFinancialProfile';
import { useProfile } from '@/hooks/queries/useProfile';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { exportFinancialPdf } from '@/lib/export/export.service';
import { spacing } from '@/lib/theme';
import { formatCurrency, formatPercent } from '@/lib/utils/format';

export default function ExportPdfScreen() {
  const [exporting, setExporting] = useState(false);
  const { data: dashboard, isLoading: dashboardLoading } = useDashboardData();
  const { data: profile, isLoading: profileLoading } = useFinancialProfile();
  const { data: user, isLoading: userLoading } = useProfile();
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions('all');
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { showToast } = useToast();

  const loading =
    (dashboardLoading && !dashboard) ||
    (profileLoading && !profile) ||
    (userLoading && !user) ||
    (transactionsLoading && transactions.length === 0) ||
    (assetsLoading && !assets);

  async function handleExport() {
    setExporting(true);

    try {
      await exportFinancialPdf({
        dashboard,
        profile,
        userName: user?.name ?? 'Utilizador',
        transactions,
        assets,
      });
      showToast('Relatório PDF gerado com sucesso.', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Não foi possível gerar o relatório.',
        'error',
      );
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <SettingsScreenLayout title="Exportar PDF" subtitle="Relatório resumido da tua situação">
        <LoadingSpinner message="A carregar dados..." />
      </SettingsScreenLayout>
    );
  }

  return (
    <SettingsScreenLayout title="Exportar PDF" subtitle="Relatório resumido da tua situação">
      <SettingsHero
        icon={{ ios: 'doc.richtext', android: 'picture_as_pdf', web: 'picture_as_pdf' }}
        title="Relatório financeiro"
        description="Gera um PDF com estética CentFlow: património, movimentos, objectivos e ativos."
      />

      <Card variant="elevated" style={styles.card}>
        <Text variant="bodyMedium">
          Património: {formatCurrency(dashboard?.netWorth.netWorth ?? 0)}
        </Text>
        <Text variant="bodyMedium">
          Variação: {formatPercent(dashboard?.netWorthChangePercent ?? 0)}
        </Text>
        <Text variant="bodyMedium">
          Movimentos incluídos: {Math.min(transactions.length, 8)}
        </Text>
        <Text variant="bodyMedium">
          Objectivos: {assets?.goals.length ?? 0}
        </Text>
        <Text variant="caption" color="textMuted">
          O PDF usa o tema dark premium da app e pode ser partilhado por email, WhatsApp ou guardado no telemóvel.
        </Text>
      </Card>

      <Button
        label={exporting ? 'A preparar...' : 'Gerar e partilhar PDF'}
        onPress={handleExport}
        loading={exporting}
        fullWidth
      />
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
});
