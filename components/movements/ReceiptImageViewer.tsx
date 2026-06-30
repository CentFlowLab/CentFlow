import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CachedImage } from '@/components/ui/CachedImage';
import { Text } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

type ReceiptImageViewerProps = {
  visible: boolean;
  uri: string;
  fileName?: string;
  onClose: () => void;
};

export function ReceiptImageViewer({
  visible,
  uri,
  fileName,
  onClose,
}: ReceiptImageViewerProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={styles.closeZone} onPress={onClose} accessibilityLabel="Fechar" />

        <View style={[styles.toolbar, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.toolbarText}>
            <Text variant="bodyMedium">Talão original</Text>
            {fileName ? (
              <Text variant="caption" color="textMuted" numberOfLines={1}>
                {fileName}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={styles.closeButton}
            accessibilityLabel="Fechar visualização">
            <SymbolView
              name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
              tintColor={colors.text}
              size={30}
            />
          </Pressable>
        </View>

        <CachedImage uri={uri} style={styles.image} contentFit="contain" />

        <Text
          variant="caption"
          color="textMuted"
          align="center"
          style={[styles.hint, { paddingBottom: insets.bottom + spacing.lg }]}>
          Toca fora da imagem para fechar
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
  },
  closeZone: {
    ...StyleSheet.absoluteFill,
  },
  toolbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  toolbarText: {
    flex: 1,
    gap: 2,
  },
  closeButton: {
    padding: spacing.xs,
  },
  image: {
    width: '100%',
    height: '72%',
    zIndex: 1,
  },
  hint: {
    position: 'absolute',
    bottom: 0,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 2,
  },
});
