import { Pressable, StyleSheet, View } from 'react-native';
import { SectionHeader, Text } from '@/components/ui';
import type { AttentionItem, Suggestion } from '@/lib/domain';
import { spacing } from '@/lib/theme';

import { AttentionCard } from './AttentionCard';
import { SuggestionCard } from './SuggestionCard';

type HomeAlertsSectionProps = {
  attentionItems: AttentionItem[];
  suggestions: Suggestion[];
  onOpenAllAttention?: () => void;
  onSuggestionPress?: (suggestion: Suggestion) => void;
};

export function HomeAlertsSection({
  attentionItems,
  suggestions,
  onOpenAllAttention,
  onSuggestionPress,
}: HomeAlertsSectionProps) {
  const topAttention = attentionItems.slice(0, 3);
  const topSuggestions = suggestions.slice(0, 2);
  const hasAttention = topAttention.length > 0;
  const hasSuggestions = topSuggestions.length > 0;

  if (!hasAttention && !hasSuggestions) {
    return (
      <View style={styles.wrap}>
        <Text variant="caption" color="textMuted" align="center">
          Nada urgente por agora
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {hasAttention ? (
        <View style={styles.block}>
          <View style={styles.headerRow}>
            <SectionHeader title="Precisas de atenção" />
            {attentionItems.length > 3 && onOpenAllAttention ? (
              <Pressable onPress={onOpenAllAttention} hitSlop={8}>
                <Text variant="caption" color="primary">
                  Ver todos ({attentionItems.length})
                </Text>
              </Pressable>
            ) : null}
          </View>
          {topAttention.map((item) => (
            <AttentionCard key={item.id} item={item} />
          ))}
        </View>
      ) : null}

      {hasSuggestions ? (
        <View style={styles.block}>
          <SectionHeader title="Sugestões" />
          {topSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onPress={(item) => onSuggestionPress?.(item)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  block: {
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
