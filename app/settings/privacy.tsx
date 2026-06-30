import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  SettingsHero,
  SettingsScreenLayout,
} from '@/components/settings';
import { Button, Card, Text, TextField } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth';
import { openInAppLegalDocument, openLegalDocument } from '@/lib/legal/open-legal-document';
import { spacing } from '@/lib/theme';

export default function PrivacyScreen() {
  const { deleteAccount } = useAuth();
  const { showToast } = useToast();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);

  async function handleDeleteAccount() {
    if (confirmText.trim().toUpperCase() !== 'ELIMINAR') {
      showToast('Escreve ELIMINAR para confirmar.', 'error');
      return;
    }

    Alert.alert(
      'Eliminar conta permanentemente?',
      'Todos os teus dados financeiros, movimentos, objetivos e recibos serão apagados. Esta acção é irreversível.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
              router.replace('/(auth)/login');
              showToast('Conta eliminada com sucesso.', 'success');
            } catch {
              showToast('Não foi possível eliminar a conta. Tenta outra vez ou contacta support@centflow.app.', 'error');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  return (
    <SettingsScreenLayout title="Privacidade" subtitle="Os teus dados e consentimentos">
      <SettingsHero
        icon={{ ios: 'hand.raised.fill', android: 'privacy_tip', web: 'privacy_tip' }}
        title="Controlo dos teus dados"
        description="Transparência total sobre como tratamos a tua informação financeira."
      />

      <View style={styles.section}>
        <Card variant="elevated" style={styles.card}>
          <Text variant="bodyMedium">Exportar dados</Text>
          <Text variant="caption" color="textMuted">
            Descarrega uma cópia dos teus dados financeiros registados na CentFlow.
          </Text>
          <Button
            label="Exportar dados"
            variant="secondary"
            onPress={() => router.push('/settings/export-data')}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Card variant="outlined" style={styles.card}>
          <Text variant="bodyMedium">Política de privacidade</Text>
          <Text variant="caption" color="textMuted">
            Como tratamos, protegemos e armazenamos a tua informação.
          </Text>
          <Button
            label="Ver política"
            variant="secondary"
            onPress={() => void openLegalDocument('privacy')}
          />
          <Button
            label="Versão na app"
            variant="ghost"
            onPress={() => openInAppLegalDocument('privacy')}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Card variant="outlined" style={styles.card}>
          <Text variant="bodyMedium">Termos de utilização</Text>
          <Text variant="caption" color="textMuted">
            Condições de uso da CentFlow e aviso financeiro.
          </Text>
          <Button
            label="Ver termos"
            variant="secondary"
            onPress={() => void openLegalDocument('terms')}
          />
          <Button
            label="Versão na app"
            variant="ghost"
            onPress={() => openInAppLegalDocument('terms')}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Card variant="outlined" style={styles.card}>
          <Text variant="bodyMedium">Consentimentos futuros</Text>
          <Text variant="caption" color="textMuted">
            Ligações bancárias e open banking exigirão consentimento explícito revogável a
            qualquer momento. Nenhum token bancário será guardado localmente.
          </Text>
        </Card>
      </View>

      <View style={styles.section}>
        <Card variant="outlined" style={styles.card}>
          <Text variant="bodyMedium">Eliminar conta</Text>
          <Text variant="caption" color="textMuted">
            Pedido de eliminação permanente de todos os dados associados à tua conta.
          </Text>
          {!showDeleteForm ? (
            <Button
              label="Pedir eliminação"
              variant="danger"
              onPress={() => setShowDeleteForm(true)}
            />
          ) : (
            <>
              <Text variant="caption" color="textMuted">
                Escreve ELIMINAR para confirmar que compreendes que esta acção é irreversível.
              </Text>
              <TextField
                label="Confirmação"
                value={confirmText}
                onChangeText={setConfirmText}
                autoCapitalize="characters"
                placeholder="ELIMINAR"
              />
              <Button
                label="Eliminar conta permanentemente"
                variant="danger"
                onPress={handleDeleteAccount}
                loading={deleting}
                disabled={confirmText.trim().toUpperCase() !== 'ELIMINAR'}
              />
              <Button
                label="Cancelar"
                variant="ghost"
                onPress={() => {
                  setShowDeleteForm(false);
                  setConfirmText('');
                }}
              />
            </>
          )}
        </Card>
      </View>
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing['2xl'],
  },
  card: {
    gap: spacing.md,
  },
});
