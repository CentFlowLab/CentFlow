import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Text, TextField } from '@/components/ui';
import { useChangePassword } from '@/hooks/mutations/useProfileMutations';
import { useToast } from '@/components/ui/Toast';
import { isMockAuthEnabled } from '@/lib/auth/mock-auth';
import { spacing } from '@/lib/theme';

type ChangePasswordModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function ChangePasswordModal({ visible, onClose }: ChangePasswordModalProps) {
  const { showToast } = useToast();
  const changePassword = useChangePassword();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  function handleClose() {
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  }

  async function handleSubmit() {
    if (newPassword.length < 8) {
      showToast('A palavra-passe deve ter pelo menos 8 caracteres.', 'error');
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
      maxHeight="70%"
      header={() => (
        <View style={styles.header}>
          <Text variant="h3">Alterar palavra-passe</Text>
          <Text variant="caption" color="textMuted">
            Escolhe uma palavra-passe segura com pelo menos 8 caracteres.
          </Text>
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
      <Button label="Cancelar" variant="ghost" onPress={handleClose} fullWidth />
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
});
