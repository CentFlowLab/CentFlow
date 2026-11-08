import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '../theme';
import { Button, type ButtonVariant } from './Button';
import { Text } from './Text';

export type DialogAction = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
};

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  actions: readonly DialogAction[];
  onDismiss: () => void;
  children?: ReactNode;
};

/**
 * Diálogo modal multiplataforma. Substitui `Alert.alert`, que não funciona na web.
 * As ações aparecem empilhadas, com a principal primeiro.
 */
export function Dialog({ visible, title, message, actions, onDismiss, children }: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
          accessible={false}
          importantForAccessibility="no"
          onPress={onDismiss}
        />
        <View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text variant="title3">{title}</Text>
          {message ? (
            <Text variant="callout" tone="secondary">
              {message}
            </Text>
          ) : null}
          {children}
          <View style={styles.actions}>
            {actions.map((action) => (
              <Button
                key={action.label}
                label={action.label}
                variant={action.variant ?? 'primary'}
                loading={action.loading}
                disabled={action.disabled}
                onPress={action.onPress}
                fullWidth
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing['2xl'],
    gap: spacing.md,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
