import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { DailyAssistantPlan, AssistantActionId } from '@/lib/domain/financial';
import { colors, radius, spacing } from '@/lib/theme';

type HomeAssistantCardProps = {
  plan: DailyAssistantPlan;
  onAction: (actionId: AssistantActionId) => void;
  onOpenFullPlan: () => void;
  showFullPlanLink?: boolean;
};

export function HomeAssistantCard({
  plan,
  onAction,
  onOpenFullPlan,
  showFullPlanLink = true,
}: HomeAssistantCardProps) {
  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.header}>
        <Text variant="label" color="textMuted">
          Plano de hoje
        </Text>
        <Text variant="bodyMedium" color="textSecondary">
          {plan.insights.length} {plan.insights.length === 1 ? 'ação' : 'ações'} para ti
        </Text>
      </View>

      <View style={styles.list}>
        {plan.insights.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => item.actionId && onAction(item.actionId)}
            disabled={!item.actionId}
            style={({ pressed }) => [styles.row, pressed && item.actionId && styles.rowPressed]}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <View style={styles.text}>
              <Text variant="bodyMedium">{item.title}</Text>
              <Text variant="caption" color="textSecondary">
                {item.description}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {plan.savingsTip ? (
        <View style={styles.tip}>
          <Text variant="caption" color="primary">
            💡 {plan.savingsTip}
          </Text>
        </View>
      ) : null}

      {showFullPlanLink ? (
        <Pressable onPress={onOpenFullPlan} style={styles.cta}>
          <Text variant="bodyMedium" color="primary">
            Ver plano completo →
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: {
    opacity: 0.88,
    borderColor: colors.primary,
  },
  emoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  tip: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
  },
  cta: {
    alignSelf: 'flex-start',
  },
});
