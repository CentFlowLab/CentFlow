import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { LegalLinksFooter } from '@/components/legal/LegalLinksFooter';
import {
  SettingsHero,
  SettingsScreenLayout,
  SettingsToggleRow,
} from '@/components/settings';
import { Button, Card, Text, TextField } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth';
import {
  deleteAccount,
  userRequiresPasswordForDeletion,
} from '@/lib/account/delete-account.service';
import { getDeleteAccountConfirmationPhrase } from '@/lib/account/delete-account.constants';
import { colors, spacing } from '@/lib/theme';

export default function DeleteAccountScreen() {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phrase = getDeleteAccountConfirmationPhrase();

  useEffect(() => {
    let mounted = true;
    void userRequiresPasswordForDeletion()
      .then((value) => {
        if (mounted) setRequiresPassword(value);
      })
      .catch(() => {
        if (mounted) setRequiresPassword(true);
      })
      .finally(() => {
        if (mounted) setCheckingAuth(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const canSubmit =
    acknowledged &&
    !deleting &&
    !checkingAuth &&
    (requiresPassword ? password.length >= 8 : confirmation.trim().toUpperCase() === phrase);

  async function handleDelete() {
    if (!user?.email) {
      setError('Sessão inválida. Inicia sessão novamente.');
      return;
    }

    setError(null);

    Alert.alert(
      'Eliminar conta permanentemente?',
      'Esta acção não pode ser desfeita. Todos os dados associados à tua conta serão removidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => void performDelete(),
        },
      ],
    );
  }

  async function performDelete() {
    if (!user?.email) return;

    setDeleting(true);
    setError(null);

    try {
      await deleteAccount({
        email: user.email,
        password: requiresPassword ? password : undefined,
        confirmationPhrase: requiresPassword ? undefined : confirmation,
      });
      await signOut();
      showToast('Conta eliminada com sucesso.', 'success');
      router.replace('/(auth)/login');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Não foi possível eliminar a conta.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SettingsScreenLayout title="Eliminar conta" subtitle="Acção permanente e irreversível">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <SettingsHero
          icon={{ ios: 'trash.fill', android: 'delete', web: 'delete' }}
          title="Eliminação permanente"
          description="Remove a tua conta CentFlow e os dados associados no servidor, conforme a nossa política de retenção."
        />

        <Card variant="outlined" style={styles.card}>
          <Text variant="bodyMedium">O que acontece</Text>
          <Text variant="caption" color="textMuted">
            · Perfil e preferências eliminados{'\n'}
            · Movimentos, créditos, objetivos e restantes dados financeiros removidos{'\n'}
            · Ligações Open Banking revogadas no backend{'\n'}
            · Sessão terminada e dados locais apagados neste dispositivo
          </Text>
        </Card>

        {checkingAuth ? (
          <Text variant="caption" color="textMuted">
            A verificar método de autenticação...
          </Text>
        ) : requiresPassword ? (
          <TextField
            label="Password actual"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            placeholder="Confirma com a tua password"
          />
        ) : (
          <TextField
            label={`Escreve ${phrase} para confirmar`}
            value={confirmation}
            onChangeText={setConfirmation}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder={phrase}
          />
        )}

        <Pressable
          onPress={() => setAcknowledged((value) => !value)}
          style={styles.ackRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acknowledged }}>
          <View style={[styles.checkBox, acknowledged && styles.checkBoxOn]}>
            {acknowledged ? (
              <SymbolView
                name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                size={14}
                tintColor={colors.textInverse}
              />
            ) : null}
          </View>
          <Text variant="caption" color="textSecondary" style={styles.ackLabel}>
            Compreendo que esta acção é permanente e que perderei acesso a todos os meus dados na
            CentFlow.
          </Text>
        </Pressable>

        {error ? (
          <Card variant="outlined" style={styles.errorCard} padding="md">
            <Text variant="caption" color="danger">
              {error}
            </Text>
          </Card>
        ) : null}

        <Button
          label={deleting ? 'A eliminar conta...' : 'Eliminar conta permanentemente'}
          variant="danger"
          onPress={handleDelete}
          loading={deleting}
          disabled={!canSubmit}
          fullWidth
        />

        <LegalLinksFooter align="left" />
      </ScrollView>
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  card: {
    gap: spacing.sm,
  },
  errorCard: {
    borderColor: '#ef4444',
  },
  ackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkBoxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ackLabel: {
    flex: 1,
    lineHeight: 20,
  },
});
