import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { Warranty } from '@/lib/domain/assets.types';
import { getWarrantyExpiryInfo } from '@/lib/domain/warranty.utils';
import { colors, radius, spacing } from '@/lib/theme';
import { formatDateShort } from '@/lib/utils/format';

type WarrantyListItemProps = {
  warranty: Warranty;
};

export function WarrantyListItem({ warranty }: WarrantyListItemProps) {
  const expiry = getWarrantyExpiryInfo(warranty.expiresAt);
  const isUrgent = expiry.status === 'critical' || expiry.status === 'expired';

  return (
    <Card
      variant="elevated"
      style={[styles.card, isUrgent && styles.cardUrgent]}>
      <View style={[styles.icon, isUrgent && styles.iconUrgent]}>
        <SymbolView
          name={{
            ios: isUrgent ? 'exclamationmark.shield.fill' : 'shield.fill',
            android: isUrgent ? 'gpp_maybe' : 'verified_user',
            web: isUrgent ? 'gpp_maybe' : 'verified_user',
          }}
          tintColor={expiry.color}
          size={18}
        />
      </View>

      <View style={styles.content}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {warranty.product}
        </Text>
        <Text variant="caption" color="textMuted">
          Expira {formatDateShort(warranty.expiresAt)}
          {warranty.store ? ` · ${warranty.store}` : ''}
        </Text>
        {warranty.receiptLabel ? (
          <View style={styles.receiptRow}>
            <SymbolView
              name={{
                ios: 'doc.text.fill',
                android: 'description',
                web: 'description',
              }}
              tintColor={colors.primary}
              size={12}
            />
            <Text variant="caption" color="primary" numberOfLines={1}>
              Talão: {warranty.receiptLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.badge, { backgroundColor: `${expiry.color}22` }]}>
        <Text variant="caption" style={{ color: expiry.color }}>
          {expiry.label}
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
  cardUrgent: {
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconUrgent: {
    backgroundColor: `${colors.danger}18`,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    maxWidth: 110,
  },
});
