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
  const hasAnyData =
    summary.goalsCount > 0 || summary.warrantiesCount > 0 || summary.inventoryCount > 0;

  if (!hasAnyData) {
    return (
      <Card variant="outlined" style={styles.card}>
        <Text variant="label" color="textMuted">
          Resumo rápido
        </Text>
        <View style={styles.grid}>
          <SummaryTile
            icon={{ ios: 'target', android: 'flag', web: 'flag' }}
            label="Em objetivos"
            value={formatCurrency(0)}
            hint={hints.goals ?? '0 ativos'}
            color={colors.primary}
          />
          <SummaryTile
            icon={{ ios: 'shield.fill', android: 'verified_user', web: 'verified_user' }}
            label="Garantias"
            value="0"
            hint={hints.warranties ?? 'registadas'}
            color={colors.accent}
          />
          <SummaryTile
            icon={{ ios: 'archivebox.fill', android: 'inventory_2', web: 'inventory_2' }}
            label="Inventário"
            value="0"
            hint={hints.inventory ?? 'itens'}
            color={colors.textSecondary}
          />
        </View>
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
      {summary.accountsTotal !== undefined && summary.accountsTotal > 0 ? (
        <View style={styles.accountsRow}>
          <Text variant="bodyMedium" color="textSecondary">
            Contas
          </Text>
          <Text variant="bodyMedium" color="primary">
            {formatCurrency(summary.accountsTotal)}
          </Text>
        </View>
      ) : null}
      <View style={styles.grid}>
        <SummaryTile
          icon={{ ios: 'target', android: 'flag', web: 'flag' }}
          label="Em objetivos"
          value={formatCurrency(summary.goalsSaved)}
          hint={hints.goals ?? `${summary.goalsCount} ativo${summary.goalsCount === 1 ? '' : 's'}`}
          color={colors.primary}
        />
        <SummaryTile
          icon={{ ios: 'shield.fill', android: 'verified_user', web: 'verified_user' }}
          label="Garantias"
          value={String(summary.warrantiesCount)}
          hint={hints.warranties ?? 'registadas'}
          color={colors.accent}
        />
        <SummaryTile
          icon={{ ios: 'archivebox.fill', android: 'inventory_2', web: 'inventory_2' }}
          label="Inventário"
          value={String(summary.inventoryCount)}
          hint={hints.inventory ?? 'itens'}
          color={colors.textSecondary}
        />
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
      <Text variant="caption" color="textMuted" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="bodyMedium" numberOfLines={1}>
        {value}
      </Text>
      <Text variant="caption" color="textMuted" numberOfLines={1}>
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
  accountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  tile: {
    flex: 1,
    gap: 2,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 0,
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
