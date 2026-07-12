import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Card, Text } from '@/components/ui';
import type { DailyAssistantPlan, AssistantActionId } from '@/lib/domain/financial';
import { colors, radius, spacing } from '@/lib/theme';

type HomeAssistantCardProps = {
  plan: DailyAssistantPlan;
  onAction: (actionId: AssistantActionId) => void;
  onOpenActionCenter: () => void;
};

export function HomeAssistantCard({ plan, onAction, onOpenActionCenter }: HomeAssistantCardProps) {
  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.header}>
        <Text variant="label" color="textMuted">
          Plano de hoje
        </Text>
        <Text variant="bodyMedium" color="textSecondary">
          {plan.insights.length} {plan.insights.length === 1 ? 'acção' : 'acções'} para ti
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

      <Pressable onPress={onOpenActionCenter} style={styles.cta}>
        <Text variant="bodyMedium" color="primary">
          Ver plano completo →
        </Text>
      </Pressable>

      <Pressable onPress={() => router.push('/assistant')} style={styles.chatCta}>
        <Text variant="caption" color="textSecondary">
          Perguntar ao assistente →
        </Text>
      </Pressable>
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
  chatCta: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
});
