import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { SettingsHero, SettingsScreenLayout } from '@/components/settings/SettingsScreenLayout';
import { Button, Card, Text, TextField } from '@/components/ui';
import { spacing } from '@/lib/theme';

export default function SecurityScreen() {
  const [biometrics, setBiometrics] = useState(false);

  function handleChangePassword() {
    Alert.alert(
      'Alterar palavra-passe',
      'Serás redirecionado para o fluxo de recuperação de palavra-passe.',
    );
  }

  function handleToggleBiometrics() {
    setBiometrics((prev) => !prev);
    Alert.alert(
      biometrics ? 'Biometria desactivada' : 'Biometria activada',
      biometrics
        ? 'O desbloqueio por impressão digital foi desactivado.'
        : 'Podes usar impressão digital ou Face ID para abrir a app.',
    );
  }

  return (
    <SettingsScreenLayout title="Segurança" subtitle="Protege a tua conta e dados">
      <SettingsHero
        icon={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
        title="Controlo de acesso"
        description="Gere credenciais e métodos de desbloqueio da app."
      />

      <Card variant="elevated" style={styles.card}>
        <TextField
          label="Palavra-passe actual"
          value="••••••••"
          editable={false}
          secureTextEntry
        />
        <Button label="Alterar palavra-passe" variant="secondary" onPress={handleChangePassword} />
      </Card>

      <Card variant="outlined" style={styles.card}>
        <View>
          <Text variant="bodyMedium">Desbloqueio biométrico</Text>
          <Text variant="caption" color="textMuted">
            Face ID ou impressão digital ao abrir a app
          </Text>
        </View>
        <Button
          label={biometrics ? 'Desactivar biometria' : 'Activar biometria'}
          variant="secondary"
          onPress={handleToggleBiometrics}
        />
      </Card>

      <Card variant="outlined" style={styles.card}>
        <Text variant="bodyMedium">Sessões activas</Text>
        <Text variant="caption" color="textMuted">
          1 dispositivo ligado — este telemóvel
        </Text>
      </Card>
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
});
