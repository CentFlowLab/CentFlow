import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  SettingsHero,
  SettingsScreenLayout,
} from '@/components/settings';
import { Button, Card, Text } from '@/components/ui';
import { spacing } from '@/lib/theme';

export default function PrivacyScreen() {
  return (
    <SettingsScreenLayout title="Privacidade" subtitle="Os teus dados e consentimentos">
      <SettingsHero
        icon={{ ios: 'hand.raised.fill', android: 'privacy_tip', web: 'privacy_tip' }}
        title="Controlo dos teus dados"
        description="Transparência e preparação para consentimentos futuros (ex.: open banking)."
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
          <Button label="Ver política" variant="ghost" onPress={() => {}} disabled />
          <Text variant="caption" color="textMuted">
            Disponível em breve no site CentFlow.
          </Text>
        </Card>
      </View>

      <View style={styles.section}>
        <Card variant="elevated" style={styles.card}>
          <Text variant="bodyMedium">Comparações anónimas (benchmarks)</Text>
          <Text variant="caption" color="textMuted">
            Contribui opcionalmente com agregados de gasto para comparações estatísticas —
            opt-in explícito, dados nunca identificáveis.
          </Text>
          <Button
            label="Gerir consentimento"
            variant="secondary"
            onPress={() => router.push('/settings/benchmark-consent')}
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
            Pedido de eliminação permanente — disponível quando o backend estiver pronto.
          </Text>
          <Button label="Pedir eliminação" variant="ghost" disabled />
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
