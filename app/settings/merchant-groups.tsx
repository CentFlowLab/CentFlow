import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { SettingsScreenLayout } from '@/components/settings/SettingsScreenLayout';
import { Button, Card, SectionHeader, Text, TextField } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import {
  useDeleteMerchantGroup,
  useMerchantGroups,
  useRemoveMerchantGroupAlias,
  useUpdateMerchantGroup,
} from '@/hooks/queries/useMerchantGroups';
import { useTransactions } from '@/hooks/queries/useTransactions';
import {
  averagePurchasesPerMonth,
  computeMonthlySpendingForGroup,
} from '@/lib/merchants/group-analytics';
import { computeMerchantGroupStats } from '@/lib/merchants/merchant-groups.service';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

export default function MerchantGroupsSettingsScreen() {
  const { group: selectedGroupId } = useLocalSearchParams<{ group?: string }>();
  const { data: groups = [], isLoading } = useMerchantGroups();
  const { data: transactions = [] } = useTransactions('all');
  const updateGroup = useUpdateMerchantGroup();
  const deleteGroup = useDeleteMerchantGroup();
  const removeAlias = useRemoveMerchantGroupAlias();
  const { showToast } = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(selectedGroupId ?? null);

  const stats = useMemo(
    () => computeMerchantGroupStats(groups, transactions),
    [groups, transactions],
  );

  function startRename(groupId: string, currentName: string) {
    setEditingId(groupId);
    setEditName(currentName);
  }

  async function saveRename(groupId: string) {
    const name = editName.trim();
    if (!name) return;
    try {
      await updateGroup.mutateAsync({ groupId, input: { name } });
      showToast('Nome atualizado.', 'success');
      setEditingId(null);
    } catch {
      showToast('Não foi possível renomear.', 'error');
    }
  }

  function confirmDelete(groupId: string, name: string) {
    Alert.alert(
      'Eliminar grupo',
      `Desassociar todos os movimentos e apagar "${name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void deleteGroup.mutateAsync(groupId).then(
              () => showToast('Grupo eliminado.', 'success'),
              () => showToast('Não foi possível eliminar.', 'error'),
            );
          },
        },
      ],
    );
  }

  function handleRemoveAlias(
    groupId: string,
    alias: string,
    movementId: string | undefined,
  ) {
    if (!movementId) {
      showToast('Nenhum movimento associado a este alias.', 'info');
      return;
    }
    Alert.alert('Remover alias', `Remover "${alias}" do grupo?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          void removeAlias.mutateAsync({ groupId, alias, movementId }).then(
            () => showToast('Alias removido.', 'success'),
            () => showToast('Não foi possível remover.', 'error'),
          );
        },
      },
    ]);
  }

  function findMovementForAlias(groupId: string, alias: string) {
    return transactions.find(
      (tx) =>
        tx.merchantGroupId === groupId &&
        tx.description?.trim().toLowerCase() === alias.trim().toLowerCase(),
    )?.id;
  }

  return (
    <SettingsScreenLayout
      title="Grupos de comerciantes"
      subtitle="Agrupa descrições similares para análise e pesquisa">
      {isLoading ? (
        <Text variant="body" color="textMuted">
          A carregar...
        </Text>
      ) : stats.length === 0 ? (
        <Card variant="outlined" style={styles.emptyCard}>
          <Text variant="body" color="textMuted">
            Ainda não tens grupos. Quando guardares despesas com descrições parecidas, a app
            sugere criar um grupo automaticamente.
          </Text>
        </Card>
      ) : (
        stats.map((group) => {
          const expanded = expandedId === group.id;
          const monthly = computeMonthlySpendingForGroup(group.id, transactions);
          const avgPerMonth = averagePurchasesPerMonth(group.id, transactions);
          const groupMovements = transactions
            .filter((tx) => tx.merchantGroupId === group.id)
            .sort((a, b) => b.date.localeCompare(a.date));

          return (
            <Card key={group.id} variant="outlined" style={styles.groupCard}>
              <Pressable
                onPress={() => setExpandedId(expanded ? null : group.id)}
                style={styles.groupHeader}>
                <SymbolView
                  name={{ ios: 'storefront.fill', android: 'store', web: 'store' }}
                  tintColor={colors.primary}
                  size={22}
                />
                <View style={styles.groupMeta}>
                  {editingId === group.id ? (
                    <View style={styles.renameRow}>
                      <TextField label="Nome" value={editName} onChangeText={setEditName} />
                      <Button label="Guardar" onPress={() => void saveRename(group.id)} />
                    </View>
                  ) : (
                    <>
                      <Text variant="bodyMedium">{group.name}</Text>
                      <Text variant="caption" color="textMuted" numberOfLines={2}>
                        {group.aliases.join(' · ')}
                      </Text>
                      <Text variant="caption" color="textMuted">
                        {group.movementCount} movimentos · {formatCurrency(group.totalAmount)}{' '}
                        total
                      </Text>
                    </>
                  )}
                </View>
              </Pressable>

              {expanded ? (
                <View style={styles.expanded}>
                  <Text variant="label" color="textMuted">
                    Evolução mensal
                  </Text>
                  <View style={styles.monthlyRow}>
                    {monthly.map((bucket) => (
                      <View key={bucket.label} style={styles.monthBucket}>
                        <Text variant="caption" color="textMuted">
                          {bucket.label}
                        </Text>
                        <Text variant="caption">{formatCurrency(bucket.amount)}</Text>
                      </View>
                    ))}
                  </View>
                  <Text variant="caption" color="textMuted">
                    Média: {avgPerMonth.toFixed(1)} compras/mês
                  </Text>

                  <SectionHeader title="Movimentos" />
                  {groupMovements.slice(0, 20).map((tx) => (
                    <View key={tx.id} style={styles.movementRow}>
                      <Text variant="bodyMedium" numberOfLines={1}>
                        {tx.description ?? tx.categoryLabel}
                      </Text>
                      <Text variant="caption" color="textMuted">
                        {formatDateShort(tx.date)} · −{formatCurrency(tx.amount)}
                      </Text>
                    </View>
                  ))}

                  <View style={styles.actions}>
                    <Button
                      label="Editar nome"
                      variant="secondary"
                      onPress={() => startRename(group.id, group.name)}
                    />
                    {group.aliases.map((alias) => (
                      <Button
                        key={alias}
                        label={`Remover "${alias}"`}
                        variant="secondary"
                        onPress={() =>
                          handleRemoveAlias(group.id, alias, findMovementForAlias(group.id, alias))
                        }
                      />
                    ))}
                    <Button
                      label="Eliminar grupo"
                      variant="secondary"
                      onPress={() => confirmDelete(group.id, group.name)}
                    />
                    <Button
                      label="Ver em Movimentos"
                      onPress={() => router.push(`/(tabs)/movimentos?group=${group.id}`)}
                    />
                  </View>
                </View>
              ) : null}
            </Card>
          );
        })
      )}
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    padding: spacing.lg,
  },
  groupCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  groupHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  groupMeta: {
    flex: 1,
    gap: spacing.xs,
  },
  renameRow: {
    gap: spacing.sm,
  },
  expanded: {
    marginTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  monthlyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  monthBucket: {
    minWidth: 56,
  },
  movementRow: {
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
