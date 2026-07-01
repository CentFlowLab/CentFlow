import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { openSuggestionRoute } from '@/lib/navigation/dashboard-routes';
import type { Suggestion } from '@/lib/domain';
import { colors, spacing } from '@/lib/theme';

const TYPE_ICON = {
  goal: { ios: 'target', android: 'flag', web: 'flag' },
  savings: { ios: 'leaf.fill', android: 'eco', web: 'eco' },
  investment: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' },
  general: { ios: 'lightbulb.fill', android: 'lightbulb', web: 'lightbulb' },
} as const;

type SuggestionCardProps = {
  suggestion: Suggestion;
};

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  return (
    <Pressable
      onPress={() => openSuggestionRoute(suggestion)}
      accessibilityRole="button"
      accessibilityLabel={suggestion.title}>
      <Card variant="elevated" style={styles.card}>
        <View style={styles.iconBox}>
          <SymbolView
            name={TYPE_ICON[suggestion.type]}
            tintColor={colors.primary}
            size={20}
          />
        </View>
        <View style={styles.content}>
          <Text variant="bodyMedium" style={styles.title}>
            {suggestion.title}
          </Text>
          <Text variant="caption" color="textSecondary">
            {suggestion.description}
          </Text>
          {suggestion.actionLabel ? (
            <Text variant="caption" color="primary" style={styles.action}>
              {suggestion.actionLabel} →
            </Text>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontWeight: '600',
  },
  action: {
    marginTop: spacing.xs,
    fontWeight: '600',
  },
});
