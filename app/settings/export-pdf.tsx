import { useState } from 'react';
import { Alert, Share, StyleSheet } from 'react-native';

import { SettingsHero, SettingsScreenLayout } from '@/components/settings/SettingsScreenLayout';
import { Button, Card, Text } from '@/components/ui';
import { useDashboardData } from '@/hooks/queries/useDashboardData';
import { useFinancialProfile } from '@/hooks/queries/useFinancialProfile';
import { spacing } from '@/lib/theme';
import { formatCurrency, formatPercent } from '@/lib/utils/format';

export default function ExportPdfScreen() {
  const [exporting, setExporting] = useState(false);
  const { data: dashboard } = useDashboardData();
  const { data: profile } = useFinancialProfile();

  async function handleExport() {
    setExporting(true);

    try {
      const summary = [
        'CentFlow — Relatório Financeiro',
        '================================',
        '',
        `Património líquido: ${formatCurrency(dashboard?.netWorth.netWorth ?? 0)}`,
        `Variação: ${formatPercent(dashboard?.netWorthChangePercent ?? 0)}`,
        `Perfil financeiro: ${profile?.score ?? 0}% (${profile?.levelLabel ?? '—'})`,
        '',
        'Este relatório foi gerado a partir dos dados da tua conta CentFlow.',
      ].join('\n');

      await Share.share({
        message: summary,
        title: 'CentFlow — Relatório',
      });
    } catch {
      Alert.alert('Exportação cancelada', 'Não foi possível partilhar o relatório.');
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
        <Text variant="body" color="textSecondary">
          O relatório inclui património líquido, variação recente e nível do teu perfil
          financeiro. Podes partilhar por email, WhatsApp ou guardar como PDF no telemóvel.
        </Text>
      </Card>

      <Button
        label={exporting ? 'A preparar...' : 'Gerar e partilhar relatório'}
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
