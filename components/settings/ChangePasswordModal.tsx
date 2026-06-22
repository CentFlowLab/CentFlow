import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { authService, useAuth } from '@/lib/auth';
import { isMockAuthEnabled } from '@/lib/auth/mock-auth';
import { logSecurityError, logSecurityEvent } from '@/lib/security';
import { spacing } from '@/lib/theme';

type ChangePasswordModalProps = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Alteração de password apenas via email seguro — nunca in-app.
 */
export function ChangePasswordModal({ visible, onClose }: ChangePasswordModalProps) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  function handleRequestEmail() {
    if (!user?.email) {
      showToast('Email da conta indisponível.', 'error');
      return;
    }

    Alert.alert(
      'Alterar palavra-passe',
      `Enviaremos um email para ${user.email} com um link seguro para definires uma nova palavra-passe.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar email',
          onPress: () => {
            setLoading(true);
            void authService
              .requestPasswordReset(user.email)
              .then(() => {
                logSecurityEvent('password_reset_requested');
                showToast(
                  'Enviámos um email com instruções para redefinir a palavra-passe.',
                  'success',
                );
                onClose();
              })
              .catch((error: unknown) => {
                logSecurityError('password_reset_request_failed', error);
                showToast('Não foi possível enviar o email. Tenta novamente.', 'error');
              })
              .finally(() => setLoading(false));
          },
        },
      ],
    );
  }

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="50%"
      header={() => (
        <View style={styles.header}>
          <Text variant="h3">Alterar palavra-passe</Text>
          <Text variant="caption" color="textMuted">
            Por segurança, enviamos um link por email. Nunca alteramos a palavra-passe
            directamente na app.
          </Text>
        </View>
      )}>
      <Button
        label={loading ? 'A enviar...' : 'Enviar email de redefinição'}
        onPress={handleRequestEmail}
        loading={loading}
        disabled={isMockAuthEnabled() || loading}
        fullWidth
      />
      <Button label="Cancelar" variant="ghost" onPress={onClose} fullWidth />
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
});
