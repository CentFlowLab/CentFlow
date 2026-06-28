import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Text, TextField } from '@/components/ui';
import type { FuzzyMatchResult } from '@/lib/merchants/fuzzy-match';
import type { MerchantGroup } from '@/lib/domain/merchant-group.types';
import { colors, spacing } from '@/lib/theme';

export type MerchantGroupSuggestionMode =
  | {
      kind: 'existing';
      group: MerchantGroup;
      newDescription: string;
      movementId: string;
    }
  | {
      kind: 'create';
      newDescription: string;
      movementId: string;
      matches: FuzzyMatchResult[];
      suggestedName: string;
    };

type MerchantGroupSuggestionSheetProps = {
  visible: boolean;
  mode: MerchantGroupSuggestionMode | null;
  loading?: boolean;
  onClose: () => void;
  onDismiss: () => void;
  onConfirmExisting: (groupId: string, alias: string, movementId: string) => void;
  onConfirmCreate: (name: string, aliases: string[], movementIds: string[]) => void;
};

export function MerchantGroupSuggestionSheet({
  visible,
  mode,
  loading = false,
  onClose,
  onDismiss,
  onConfirmExisting,
  onConfirmCreate,
}: MerchantGroupSuggestionSheetProps) {
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    if (visible && mode?.kind === 'create') {
      setGroupName(mode.suggestedName);
    }
  }, [visible, mode]);

  if (!mode) return null;

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onDismiss}
      onDismissed={onClose}
      maxHeight="55%"
      header={
        <Text variant="bodyMedium" style={styles.headerTitle}>
          {mode.kind === 'existing' ? '💡 Parece familiar' : '💡 Encontrámos padrões'}
        </Text>
      }>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        {mode.kind === 'existing' ? (
          <>
            <Text variant="body" color="textMuted">
              &quot;{mode.newDescription}&quot; parece ser o mesmo que o grupo &quot;
              {mode.group.name}&quot;.
            </Text>
            <Text variant="label" color="textMuted" style={styles.sectionLabel}>
              Descrições no grupo
            </Text>
            <View style={styles.aliasRow}>
              {mode.group.aliases.slice(0, 6).map((alias) => (
                <Text key={alias} variant="caption" style={styles.aliasChip}>
                  {alias}
                </Text>
              ))}
            </View>
            <Button
              label={`Adicionar ao grupo "${mode.group.name}"`}
              onPress={() =>
                onConfirmExisting(mode.group.id, mode.newDescription, mode.movementId)
              }
              loading={loading}
              fullWidth
            />
            <Button
              label="Não, são sítios diferentes"
              variant="secondary"
              onPress={onDismiss}
              fullWidth
              style={styles.secondaryBtn}
            />
          </>
        ) : (
          <>
            <Text variant="body" color="textMuted">
              &quot;{mode.newDescription}&quot; parece ser o mesmo que:
            </Text>
            {mode.matches.map((match) => (
              <Text key={match.movementId} variant="bodyMedium" style={styles.matchLine}>
                • &quot;{match.description}&quot;
              </Text>
            ))}
            <Text variant="body" color="textMuted" style={styles.question}>
              Queres criar um grupo?
            </Text>
            <TextField
              label="Nome do grupo"
              value={groupName}
              onChangeText={setGroupName}
              placeholder={mode.suggestedName}
            />
            <Button
              label="Criar grupo"
              onPress={() => {
                const name = (groupName || mode.suggestedName).trim();
                const aliases = Array.from(
                  new Set([
                    mode.newDescription,
                    ...mode.matches.map((m) => m.description),
                  ]),
                );
                const movementIds = [
                  mode.movementId,
                  ...mode.matches.map((m) => m.movementId),
                ];
                onConfirmCreate(name, aliases, movementIds);
              }}
              loading={loading}
              fullWidth
            />
            <Button
              label="Não, ignorar"
              variant="secondary"
              onPress={onDismiss}
              fullWidth
              style={styles.secondaryBtn}
            />
          </>
        )}
      </ScrollView>
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    paddingHorizontal: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  sectionLabel: {
    marginTop: spacing.sm,
  },
  aliasRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  aliasChip: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    overflow: 'hidden',
  },
  matchLine: {
    marginLeft: spacing.xs,
  },
  question: {
    marginTop: spacing.sm,
  },
  secondaryBtn: {
    marginTop: spacing.xs,
  },
});
