import { SymbolView } from 'expo-symbols';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SegmentedControl } from '@/components/layout';
import { Button, Text } from '@/components/ui';
import type { ReceiptDraft } from '@/lib/domain/receipt.types';
import {
  getReceiptDigitizedUri,
  getReceiptDisplayUri,
} from '@/lib/receipt/receipt-image-preprocess';
import { colors, radius, spacing } from '@/lib/theme';

type ReceiptDigitizePreviewProps = {
  visible: boolean;
  draft: ReceiptDraft;
  selection: 'digitized' | 'original';
  onSelectionChange: (value: 'digitized' | 'original') => void;
  onConfirm: () => void;
  onRetake: () => void;
  onCancel: () => void;
};

const SEGMENTS = [
  { key: 'digitized' as const, label: 'Digitalizado' },
  { key: 'original' as const, label: 'Original' },
];

export function ReceiptDigitizePreview({
  visible,
  draft,
  selection,
  onSelectionChange,
  onConfirm,
  onRetake,
  onCancel,
}: ReceiptDigitizePreviewProps) {
  const insets = useSafeAreaInsets();
  const previewUri =
    selection === 'digitized' ? getReceiptDigitizedUri(draft) : getReceiptDisplayUri(draft);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onCancel}
      statusBarTranslucent>
      <View style={[styles.backdrop, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text variant="h2">Pré-visualização</Text>
              <Text variant="caption" color="textMuted">
                Compara a versão digitalizada com a foto original antes de analisar o
                talão.
              </Text>
            </View>
            <Pressable onPress={onCancel} hitSlop={12} accessibilityLabel="Cancelar">
              <SymbolView
                name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
                tintColor={colors.textMuted}
                size={28}
              />
            </Pressable>
          </View>

          <SegmentedControl
            segments={SEGMENTS}
            value={selection}
            onChange={onSelectionChange}
          />

          <View style={styles.previewFrame}>
            <Image source={{ uri: previewUri }} style={styles.image} resizeMode="contain" />
            <View style={styles.badge}>
              <SymbolView
                name={{
                  ios: selection === 'digitized' ? 'wand.and.stars' : 'photo',
                  android: selection === 'digitized' ? 'auto_fix_high' : 'photo',
                  web: selection === 'digitized' ? 'auto_fix_high' : 'photo',
                }}
                tintColor={colors.primary}
                size={16}
              />
              <Text variant="caption" color="primary">
                {selection === 'digitized'
                  ? 'Contraste, nitidez e escala de cinzentos'
                  : 'Foto tal como foi capturada'}
              </Text>
            </View>
          </View>

          <Text variant="caption" color="textMuted" style={styles.hint}>
            A versão digitalizada melhora a leitura OCR. Usa a original se o resultado
            parecer distorcido.
          </Text>

          <View style={styles.actions}>
            <Button label="Usar esta versão" onPress={onConfirm} fullWidth size="lg" />
            <Button label="Tirar outra foto" variant="secondary" onPress={onRetake} fullWidth />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  previewFrame: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHighlight,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 280,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  hint: {
    lineHeight: 18,
  },
  actions: {
    gap: spacing.sm,
  },
});
