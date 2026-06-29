import { Linking, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

type ForceUpdateScreenProps = {
  title?: string;
  message?: string;
  storeUrl?: string | null;
  maintenanceMode?: boolean;
};

export function ForceUpdateScreen({
  title = 'Atualização obrigatória',
  message = 'Esta versão já não é suportada. Atualiza para continuares a usar a CentFlow com segurança.',
  storeUrl = null,
  maintenanceMode = false,
}: ForceUpdateScreenProps) {
  async function handleUpdatePress() {
    if (storeUrl) {
      await Linking.openURL(storeUrl);
      return;
    }

    const fallback =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com'
        : Platform.OS === 'android'
          ? 'https://play.google.com/store'
          : null;

    if (fallback) {
      await Linking.openURL(fallback);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text variant="h2">{maintenanceMode ? 'Manutenção' : title}</Text>
        <Text variant="body" color="textSecondary" style={styles.message}>
          {message}
        </Text>
        {!maintenanceMode ? (
          <Button label="Atualizar agora" onPress={handleUpdatePress} fullWidth size="lg" />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  message: {
    lineHeight: 24,
  },
});
