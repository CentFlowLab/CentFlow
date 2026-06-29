import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  SettingsHero,
  SettingsScreenLayout,
  SettingsToggleRow,
} from '@/components/settings';
import { Button, Card, LoadingSpinner, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useAssets } from '@/hooks/queries/useAssets';
import { useDashboardData } from '@/hooks/queries/useDashboardData';
import { useFinancialProfile } from '@/hooks/queries/useFinancialProfile';
import { useProfile } from '@/hooks/queries/useProfile';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { useCentFlowIntelligence } from '@/hooks/useCentFlowIntelligence';
import { exportFinancialPdf } from '@/lib/export/export.service';
import {
  countSelectedPdfSections,
  DEFAULT_PDF_SECTIONS,
  PDF_SECTION_OPTIONS,
  type PdfSectionId,
  type PdfSectionSelection,
} from '@/lib/export/pdf-sections';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency, formatPercent } from '@/lib/utils/format';

export default function ExportPdfScreen() {
  const [exporting, setExporting] = useState(false);
  const [sections, setSections] = useState<PdfSectionSelection>(DEFAULT_PDF_SECTIONS);
  const { data: dashboard, isLoading: dashboardLoading } = useDashboardData();
  const { data: profile, isLoading: profileLoading } = useFinancialProfile();
  const { data: user, isLoading: userLoading } = useProfile();
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions('all');
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { score } = useCentFlowIntelligence();
  const { showToast } = useToast();

  const loading =
    (dashboardLoading && !dashboard) ||
    (profileLoading && !profile) ||
    (userLoading && !user) ||
    (transactionsLoading && transactions.length === 0) ||
    (assetsLoading && !assets);

  function toggleSection(id: PdfSectionId, value: boolean) {
    if (id === 'patrimonio') return;
    setSections((current) => ({ ...current, [id]: value }));
  }

  async function handleExport() {
    setExporting(true);

    try {
      await exportFinancialPdf({
        dashboard,
        profile,
        centFlowScore: score,
        userName: user?.name ?? 'Utilizador',
        transactions,
        assets,
        sections,
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
      <SettingsScreenLayout title="Exportar PDF" subtitle="Personaliza o teu relatório">
        <LoadingSpinner message="A carregar dados..." />
      </SettingsScreenLayout>
    );
  }

  const selectedCount = countSelectedPdfSections(sections);

  return (
    <SettingsScreenLayout title="Exportar PDF" subtitle="Personaliza o teu relatório">
      <SettingsHero
        icon={{ ios: 'doc.richtext', android: 'picture_as_pdf', web: 'picture_as_pdf' }}
        title="Relatório financeiro"
        description="Escolhe o que queres incluir. O PDF usa o tema dark premium da CentFlow."
      />

      <Card variant="elevated" style={styles.previewCard}>
        <Text variant="caption" color="textMuted">
          Pré-visualização
        </Text>
        <Text variant="bodyMedium">
          Património: {formatCurrency(dashboard?.netWorth.netWorth ?? 0)}
        </Text>
        <Text variant="bodyMedium">
          Variação: {formatPercent(dashboard?.netWorthChangePercent ?? 0)}
        </Text>
        <Text variant="caption" color="textSecondary">
          {selectedCount} secção{selectedCount === 1 ? '' : 'ões'} seleccionada
          {selectedCount === 1 ? '' : 's'}
        </Text>
      </Card>

      <Card variant="elevated" style={styles.sectionsCard}>
        <Text variant="bodyMedium" style={styles.sectionsTitle}>
          Conteúdo do relatório
        </Text>
        <Text variant="caption" color="textMuted" style={styles.sectionsLead}>
          Ativa ou desativa as secções que queres exportar. Património é sempre incluído.
        </Text>

        {PDF_SECTION_OPTIONS.map((option, index) => (
          <View
            key={option.id}
            style={[styles.sectionRow, index < PDF_SECTION_OPTIONS.length - 1 && styles.sectionDivider]}>
            <SettingsToggleRow
              label={option.label}
              description={option.description}
              value={sections[option.id]}
              onValueChange={(value) => toggleSection(option.id, value)}
              disabled={exporting || option.required}
            />
            {option.required ? (
              <Text variant="caption" color="primary" style={styles.requiredBadge}>
                Obrigatório
              </Text>
            ) : null}
          </View>
        ))}
      </Card>

      <Button
        label={exporting ? 'A preparar PDF...' : 'Gerar e partilhar PDF'}
        onPress={handleExport}
        loading={exporting}
        fullWidth
      />
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  previewCard: {
    gap: spacing.sm,
  },
  sectionsCard: {
    gap: spacing.md,
  },
  sectionsTitle: {
    fontWeight: '600',
  },
  sectionsLead: {
    lineHeight: 20,
  },
  sectionRow: {
    gap: spacing.xs,
  },
  sectionDivider: {
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  requiredBadge: {
    alignSelf: 'flex-start',
    marginTop: -spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    overflow: 'hidden',
    fontWeight: '600',
  },
});
