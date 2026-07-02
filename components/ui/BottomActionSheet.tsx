import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { colors, formSpacing, radius, spacing } from '@/lib/theme';

import { Text } from './Text';

type BottomActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
};

/**
 * Modal bottom sheet com safe area inferior automática (Android nav bar + iOS home indicator).
 */
export function BottomActionSheet({
  visible,
  onClose,
  title,
  children,
  footer,
  sheetStyle,
}: BottomActionSheetProps) {
  const { modalBottomPadding } = useResponsiveLayout();

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={onClose}
      statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { paddingBottom: modalBottomPadding },
            sheetStyle,
          ]}
          onPress={(event) => event.stopPropagation()}>
          {title ? (
            <Text variant="h3" style={styles.title}>
              {title}
            </Text>
          ) : null}
          <View style={styles.body}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '92%',
  },
  title: {
    marginBottom: spacing.sm,
  },
  body: {
    flexShrink: 1,
  },
  footer: {
    marginTop: formSpacing.footerTop,
    paddingTop: spacing.lg,
  },
});
