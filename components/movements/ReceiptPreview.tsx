import { SymbolView } from 'expo-symbols';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { ReceiptDraft } from '@/lib/domain/receipt.types';
import { colors, radius, spacing } from '@/lib/theme';

type ReceiptPreviewProps = {
  draft: ReceiptDraft;
  onRemove?: () => void;
};

export function ReceiptPreview({ draft, onRemove }: ReceiptPreviewProps) {
  return (
    <View style={styles.container}>
      <Image source={{ uri: draft.localUri }} style={styles.image} resizeMode="cover" />

      <View style={styles.meta}>
        <View style={styles.metaText}>
          <Text variant="caption" color="textSecondary">
            Talão anexado
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {draft.fileName}
          </Text>
        </View>

        {onRemove ? (
          <Pressable
            onPress={onRemove}
            style={({ pressed }) => [styles.removeButton, pressed && styles.removePressed]}
            accessibilityLabel="Remover talão">
            <SymbolView
              name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
              tintColor={colors.danger}
              size={22}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 120,
    backgroundColor: colors.surfaceHighlight,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  metaText: {
    flex: 1,
    gap: 2,
  },
  removeButton: {
    padding: spacing.xs,
  },
  removePressed: {
    opacity: 0.7,
  },
});
