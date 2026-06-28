import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Card, Text } from '@/components/ui';
import type { HomeAssetsSummary } from '@/lib/domain/home.types';
import type { HomeAssetsTileHint } from '@/lib/onboarding/personalization';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type HomeAssetsSummaryCardProps = {
  summary: HomeAssetsSummary;
  hints?: HomeAssetsTileHint;
};

export function HomeAssetsSummaryCard({ summary, hints = {} }: HomeAssetsSummaryCardProps) {
  const showWarranties = summary.warrantiesCount >= 1;
  const showInventory = summary.inventoryCount >= 3;
  const showGoals = summary.goalsCount > 0;

  if (!showWarranties && !showInventory && !showGoals) {
    return (
      <Card variant="outlined" style={styles.card}>
        <Text variant="label" color="textMuted">
          Resumo rápido
        </Text>
        <Text variant="body" color="textSecondary">
          Adiciona os teus ativos para acompanhar o teu património e ver métricas úteis aqui.
        </Text>
        <Pressable onPress={() => router.push('/(tabs)/ativos')}>
          <Text variant="bodyMedium" color="primary">
            Explorar ativos →
          </Text>
        </Pressable>
      </Card>
    );
  }

  return (
    <Card variant="outlined" style={styles.card}>
      <Text variant="label" color="textMuted">
        Resumo rápido
      </Text>
      <View style={styles.grid}>
        {showGoals ? (
          <SummaryTile
            icon={{ ios: 'target', android: 'flag', web: 'flag' }}
            label="Em objetivos"
            value={formatCurrency(summary.goalsSaved)}
            hint={hints.goals ?? `${summary.goalsCount} activo${summary.goalsCount === 1 ? '' : 's'}`}
            color={colors.primary}
          />
        ) : null}
        {showWarranties ? (
          <SummaryTile
            icon={{ ios: 'shield.fill', android: 'verified_user', web: 'verified_user' }}
            label="Garantias"
            value={String(summary.warrantiesCount)}
            hint={hints.warranties ?? 'registadas'}
            color={colors.accent}
          />
        ) : null}
        {showInventory ? (
          <SummaryTile
            icon={{ ios: 'archivebox.fill', android: 'inventory_2', web: 'inventory_2' }}
            label="Inventário"
            value={String(summary.inventoryCount)}
            hint={hints.inventory ?? 'itens'}
            color={colors.textSecondary}
          />
        ) : null}
      </View>
    </Card>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  hint,
  color,
}: {
  icon: Parameters<typeof SymbolView>[0]['name'];
  label: string;
  value: string;
  hint: string;
  color: string;
}) {
  return (
    <View style={styles.tile}>
      <View style={[styles.icon, { backgroundColor: `${color}18` }]}>
        <SymbolView name={icon} tintColor={color} size={16} />
      </View>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Text variant="bodyMedium">{value}</Text>
      <Text variant="caption" color="textMuted">
        {hint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    marginBottom: spacing['2xl'],
    backgroundColor: colors.backgroundElevated,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    gap: 2,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
});
