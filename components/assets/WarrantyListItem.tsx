import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { Warranty } from '@/lib/domain/assets.types';
import { colors, radius, spacing } from '@/lib/theme';
import { formatDateShort } from '@/lib/utils/format';

type WarrantyListItemProps = {
  warranty: Warranty;
};

function getExpiryTone(expiresAt: string): { color: string; label: string } {
  const days = Math.ceil(
    (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  if (days <= 14) return { color: colors.danger, label: 'Expira em breve' };
  if (days <= 45) return { color: colors.warning, label: 'A expirar' };
  return { color: colors.success, label: 'Válida' };
}

export function WarrantyListItem({ warranty }: WarrantyListItemProps) {
  const tone = getExpiryTone(warranty.expiresAt);

  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.icon}>
        <SymbolView
          name={{ ios: 'shield.fill', android: 'verified_user', web: 'verified_user' }}
          tintColor={tone.color}
          size={18}
        />
      </View>

      <View style={styles.content}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {warranty.product}
        </Text>
        <Text variant="caption" color="textMuted">
          Expira {formatDateShort(warranty.expiresAt)}
        </Text>
      </View>

      <View style={[styles.badge, { backgroundColor: `${tone.color}20` }]}>
        <Text variant="caption" style={{ color: tone.color }}>
          {tone.label}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
});
