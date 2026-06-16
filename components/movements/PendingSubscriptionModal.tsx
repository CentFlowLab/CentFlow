import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, Text } from '@/components/ui';
import type { DetectedSubscription } from '@/lib/subscriptions/detect-subscriptions';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

type PendingSubscriptionModalProps = {
  visible: boolean;
  detection: DetectedSubscription | null;
  onConfirm: () => void;
  onDismiss: () => void;
  isSaving?: boolean;
};

export function PendingSubscriptionModal({
  visible,
  detection,
  onConfirm,
  onDismiss,
  isSaving = false,
}: PendingSubscriptionModalProps) {
  if (!detection) return null;

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onDismiss}
      maxHeight="70%"
      header={(requestClose) => (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="h2">Nova subscrição?</Text>
            <Text variant="caption" color="textMuted">
              Detetámos um padrão recorrente nos teus movimentos
            </Text>
          </View>
          <Pressable onPress={requestClose} hitSlop={12} accessibilityLabel="Fechar">
            <SymbolView
              name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
              tintColor={colors.textMuted}
              size={28}
            />
          </Pressable>
        </View>
      )}>
      <Card variant="elevated" style={styles.card}>
        <View style={styles.row}>
          <SymbolView
            name={{ ios: 'repeat.circle.fill', android: 'autorenew', web: 'autorenew' }}
            tintColor={colors.primary}
            size={28}
          />
          <View style={styles.details}>
            <Text variant="bodyMedium">{detection.name}</Text>
            <Text variant="caption" color="textMuted">
              {formatCurrency(detection.amount)}/
              {detection.billingInterval === 'quarterly'
                ? 'trimestre'
                : detection.billingInterval === 'annual'
                  ? 'ano'
                  : 'mês'}{' '}
              · último {formatDateShort(detection.lastDate)}
            </Text>
            <Text variant="caption" color="textSecondary">
              Confiança: {detection.confidence === 'high' ? 'Alta' : 'Média'} ·{' '}
              {detection.transactionIds.length} movimentos
            </Text>
          </View>
        </View>
      </Card>

      <Text variant="body" color="textSecondary" style={styles.note}>
        Queres adicionar esta subscrição ao teu registo para acompanhar custos e renovações?
      </Text>

      <View style={styles.actions}>
        <Button
          label={isSaving ? 'A guardar...' : 'Sim, adicionar'}
          onPress={onConfirm}
          loading={isSaving}
          disabled={isSaving}
          fullWidth
        />
        <Button
          label="Não é subscrição"
          variant="ghost"
          onPress={onDismiss}
          disabled={isSaving}
          fullWidth
        />
      </View>
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  card: {
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  details: {
    flex: 1,
    gap: spacing.xs,
  },
  note: {
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  actions: {
    gap: spacing.sm,
  },
});
