import { Pressable, StyleSheet, View } from 'react-native';

import { SectionHeader, Text } from '@/components/ui';
import type { AttentionItem, Suggestion } from '@/lib/domain';
import { spacing } from '@/lib/theme';

import { AttentionCard } from './AttentionCard';
import { SuggestionCard } from './SuggestionCard';

type HomePrioritySectionProps = {
  attentionItems: AttentionItem[];
  suggestions: Suggestion[];
  onOpenAllAttention?: () => void;
};

/**
 * Uma única prioridade na Home — evita empilhar atenção + sugestões + OCR genérico.
 * Preferência: primeiro item de atenção financeira; senão uma sugestão concreta.
 */
export function HomePrioritySection({
  attentionItems,
  suggestions,
  onOpenAllAttention,
}: HomePrioritySectionProps) {
  const priorityAttention = attentionItems[0] ?? null;
  const prioritySuggestion =
    !priorityAttention && suggestions.length > 0 ? suggestions[0] : null;

  if (!priorityAttention && !prioritySuggestion) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <SectionHeader title="A tua prioridade" />
        {attentionItems.length > 1 && onOpenAllAttention ? (
          <Pressable onPress={onOpenAllAttention} hitSlop={8}>
            <Text variant="caption" color="primary">
              Ver todas ({attentionItems.length})
            </Text>
          </Pressable>
        ) : null}
      </View>
      {priorityAttention ? <AttentionCard item={priorityAttention} /> : null}
      {prioritySuggestion ? <SuggestionCard suggestion={prioritySuggestion} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
