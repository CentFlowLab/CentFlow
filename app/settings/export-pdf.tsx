import { useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  SettingsHero,
  SettingsScreenLayout,
} from '@/components/settings';
import { Button, Card, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useDashboardData } from '@/hooks/queries/useDashboardData';
import { useFinancialProfile } from '@/hooks/queries/useFinancialProfile';
import { useProfile } from '@/hooks/queries/useProfile';
import { exportFinancialPdf } from '@/lib/export/export.service';
import { spacing } from '@/lib/theme';
import { formatCurrency, formatPercent } from '@/lib/utils/format';

export default function ExportPdfScreen() {
  const [exporting, setExporting] = useState(false);
  const { data: dashboard } = useDashboardData();
  const { data: profile } = useFinancialProfile();
  const { data: user } = useProfile();
  const { showToast } = useToast();

  async function handleExport() {
    setExporting(true);

    try {
      await exportFinancialPdf(dashboard, profile, user?.name ?? 'Utilizador');
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

  return (
    <SettingsScreenLayout title="Exportar PDF" subtitle="Relatório resumido da tua situação">
      <SettingsHero
        icon={{ ios: 'doc.richtext', android: 'picture_as_pdf', web: 'picture_as_pdf' }}
        title="Relatório financeiro"
        description="Gera um resumo com património, evolução e perfil financeiro."
      />

      <Card variant="elevated" style={styles.card}>
        <Text variant="bodyMedium">
          Património: {formatCurrency(dashboard?.netWorth.netWorth ?? 0)}
        </Text>
        <Text variant="bodyMedium">
          Variação: {formatPercent(dashboard?.netWorthChangePercent ?? 0)}
        </Text>
        <Text variant="caption" color="textMuted">
          O PDF pode ser partilhado por email, WhatsApp ou guardado no telemóvel.
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
