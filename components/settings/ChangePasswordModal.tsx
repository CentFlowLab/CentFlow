import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Text, TextField } from '@/components/ui';
import { useChangePassword } from '@/hooks/mutations/useProfileMutations';
import { useFormDismiss } from '@/hooks/useFormDismiss';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth';
import { isMockAuthEnabled } from '@/lib/auth/mock-auth';
import { formHasAnyText } from '@/lib/forms';
import { validatePassword, PASSWORD_POLICY_HINT } from '@/lib/security/passwordPolicy';
import { spacing } from '@/lib/theme';

type ChangePasswordModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function ChangePasswordModal({ visible, onClose }: ChangePasswordModalProps) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const changePassword = useChangePassword();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!visible) return;
    setNewPassword('');
    setConfirmPassword('');
  }, [visible]);

  function handleClose() {
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  }

  const isDirty = useMemo(
    () => formHasAnyText(newPassword, confirmPassword),
    [newPassword, confirmPassword],
  );
  const dismiss = useFormDismiss(handleClose, isDirty);

  async function handleSubmit() {
    const validation = validatePassword(newPassword, {
      email: user?.email,
      name: user?.name,
    });
    if (!validation.valid) {
      showToast(validation.errors[0] ?? PASSWORD_POLICY_HINT, 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('As palavras-passe não coincidem.', 'error');
      return;
    }

    try {
      await changePassword.mutateAsync({ newPassword });
      showToast(
        isMockAuthEnabled()
          ? 'Palavra-passe actualizada (modo demonstração).'
          : 'Palavra-passe actualizada com sucesso.',
        'success',
      );
      handleClose();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Não foi possível alterar a palavra-passe.',
        'error',
      );
    }
  }

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={handleClose}
      isDirty={isDirty}
      maxHeight="70%"
      header={(requestClose) => (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="h3">Alterar palavra-passe</Text>
            <Text variant="caption" color="textMuted">
              {PASSWORD_POLICY_HINT}
            </Text>
          </View>
        </View>
      )}>
      <TextField
        label="Nova palavra-passe"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      <TextField
        label="Confirmar palavra-passe"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      <Button
        label="Guardar palavra-passe"
        onPress={handleSubmit}
        loading={changePassword.isPending}
        fullWidth
      />
      <Button label="Cancelar" variant="ghost" onPress={dismiss} fullWidth />
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  headerText: {
    gap: spacing.xs,
  },
});
