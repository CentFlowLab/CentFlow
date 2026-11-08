import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useTheme } from '../theme';
import { IconButton } from './IconButton';
import { Text } from './Text';

type Props = {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  /** Ações fixas no fundo (ex.: Guardar). */
  footer?: ReactNode;
  headerRight?: ReactNode;
};

const FORM_MAX_WIDTH = 560;

/** Estrutura de ecrãs de formulário apresentados como modal. */
export function FormScreen({ title, closeLabel, onClose, children, footer, headerRight }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerInner}>
          <IconButton
            icon="close"
            variant="filled"
            accessibilityLabel={closeLabel}
            onPress={onClose}
          />
          <Text variant="title3" numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          <View style={styles.headerRight}>{headerRight}</View>
        </View>
      </View>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.body}>{children}</View>
      </ScrollView>
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + spacing.md,
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}>
          <View style={styles.footerInner}>{footer}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
    maxWidth: FORM_MAX_WIDTH,
    alignSelf: 'center',
  },
  title: {
    flex: 1,
  },
  headerRight: {
    minWidth: 44,
    alignItems: 'flex-end',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  body: {
    width: '100%',
    maxWidth: FORM_MAX_WIDTH,
    alignSelf: 'center',
    gap: spacing.xl,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  footerInner: {
    width: '100%',
    maxWidth: FORM_MAX_WIDTH,
    alignSelf: 'center',
    gap: spacing.sm,
  },
});
