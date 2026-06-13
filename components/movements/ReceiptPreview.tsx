import { SymbolView } from 'expo-symbols';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { ReceiptDraft } from '@/lib/domain/receipt.types';
import {
  getReceiptDisplayUri,
  isPdfReceipt,
} from '@/lib/receipt/receipt-image-preprocess';
import { colors, radius, spacing } from '@/lib/theme';

type ReceiptPreviewVariant = 'compact' | 'hero';

type ReceiptPreviewProps = {
  draft: ReceiptDraft;
  variant?: ReceiptPreviewVariant;
  onRemove?: () => void;
  onPress?: () => void;
  qualityHint?: string | null;
};

export function ReceiptPreview({
  draft,
  variant = 'compact',
  onRemove,
  onPress,
  qualityHint,
}: ReceiptPreviewProps) {
  const isPdf = isPdfReceipt(draft.mimeType, draft.fileName);
  const displayUri = getReceiptDisplayUri(draft);
  const isHero = variant === 'hero';
  const imageHeight = isHero ? 220 : 120;

  const media = isPdf ? (
    <View style={[styles.pdfPreview, { height: imageHeight }]}>
      <SymbolView
        name={{ ios: 'doc.fill', android: 'description', web: 'description' }}
        tintColor={colors.primary}
        size={isHero ? 48 : 40}
      />
      <Text variant="caption" color="textSecondary">
        Documento PDF
      </Text>
    </View>
  ) : (
    <Image
      source={{ uri: displayUri }}
      style={[styles.image, { height: imageHeight }]}
      resizeMode={isHero ? 'contain' : 'cover'}
    />
  );

  const imageBlock = onPress && !isPdf ? (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.imagePressed]}
      accessibilityLabel="Ampliar talão"
      accessibilityRole="button">
      {media}
      <View style={styles.zoomBadge}>
        <SymbolView
          name={{ ios: 'arrow.up.left.and.arrow.down.right', android: 'fullscreen', web: 'fullscreen' }}
          tintColor={colors.text}
          size={14}
        />
        <Text variant="caption" color="text">
          Ampliar
        </Text>
      </View>
    </Pressable>
  ) : (
    media
  );

  return (
    <View style={[styles.container, isHero && styles.containerHero]}>
      {imageBlock}

      <View style={styles.meta}>
        <View style={styles.metaText}>
          <Text variant="caption" color="textSecondary">
            {isPdf ? 'Fatura PDF anexada' : 'Talão original'}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {draft.fileName}
          </Text>
          {qualityHint ? (
            <Text variant="caption" color="warning" style={styles.qualityHint}>
              {qualityHint}
            </Text>
          ) : null}
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
  containerHero: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceElevated,
  },
  image: {
    width: '100%',
    backgroundColor: colors.surfaceHighlight,
  },
  imagePressed: {
    opacity: 0.92,
  },
  pdfPreview: {
    width: '100%',
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  zoomBadge: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
  qualityHint: {
    marginTop: 2,
  },
  removeButton: {
    padding: spacing.xs,
  },
  removePressed: {
    opacity: 0.7,
  },
});
