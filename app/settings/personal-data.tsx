import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { SettingsHero, SettingsScreenLayout } from '@/components/settings/SettingsScreenLayout';
import { Button, Card, Text, TextField } from '@/components/ui';
import { useProfile } from '@/hooks/queries/useProfile';
import { spacing } from '@/lib/theme';

export default function PersonalDataScreen() {
  const { data: profile } = useProfile();
  const [name, setName] = useState(profile?.name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile?.name) setName(profile.name);
    if (profile?.email) setEmail(profile.email);
  }, [profile?.name, profile?.email]);

  function handleSave() {
    setSaved(true);
    Alert.alert('Dados guardados', 'As tuas alterações foram registadas localmente.');
    setTimeout(() => setSaved(false), 2000);
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
          A sincronização com a cloud estará disponível quando a API estiver ligada.
        </Text>
      </Card>

      <Button
        label={saved ? 'Guardado ✓' : 'Guardar alterações'}
        onPress={handleSave}
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
