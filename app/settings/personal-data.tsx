import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  SettingsHero,
  SettingsScreenLayout,
} from '@/components/settings/SettingsScreenLayout';
import { Button, Card, LoadingSpinner, Text, TextField } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useUpdateProfile } from '@/hooks/mutations/useProfileMutations';
import { useProfile } from '@/hooks/queries/useProfile';
import { spacing } from '@/lib/theme';

export default function PersonalDataScreen() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setEmail(profile.email);
    }
  }, [profile?.name, profile?.email, profile]);

  async function handleSave() {
    if (!name.trim()) {
      showToast('O nome é obrigatório.', 'error');
      return;
    }

    try {
      await updateProfile.mutateAsync({ name: name.trim(), email: email.trim() });
      showToast('Dados guardados com sucesso.', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Não foi possível guardar os dados.',
        'error',
      );
    }
  }

  if (isLoading && !profile) {
    return (
      <SettingsScreenLayout title="Dados pessoais" subtitle="Nome, email e identidade da conta">
        <LoadingSpinner message="A carregar perfil..." />
      </SettingsScreenLayout>
    );
  }

  return (
    <SettingsScreenLayout
      title="Dados pessoais"
      subtitle="Nome, email e identidade da conta">
      <SettingsHero
        icon={{ ios: 'person.circle', android: 'account_circle', web: 'account_circle' }}
        title="A tua identidade"
        description="Estes dados aparecem no perfil e nos relatórios exportados."
      />

      <Card variant="elevated" style={styles.form}>
        <TextField label="Nome" value={name} onChangeText={setName} placeholder="O teu nome" />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="email@exemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text variant="caption" color="textMuted">
          Alterações ao email podem requerer confirmação por correio, consoante o método de login.
        </Text>
      </Card>

      <Button
        label="Guardar alterações"
        onPress={handleSave}
        loading={updateProfile.isPending}
        fullWidth
      />
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
});
