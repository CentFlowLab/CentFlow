import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useProfile } from '@/hooks/queries/useProfile';
import { spacing } from '@/lib/theme';

/** Conteúdo à esquerda do header no ecrã Início */
export function DashboardHeaderLeading() {
  const { data: profile } = useProfile();

  const firstName = profile?.name?.split(' ')[0] ?? 'Utilizador';

  return (
    <View style={styles.container}>
      <Text variant="h3">Olá, {firstName} 👋</Text>
      <Text variant="caption" color="textSecondary">
        O teu assistente financeiro
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
});
