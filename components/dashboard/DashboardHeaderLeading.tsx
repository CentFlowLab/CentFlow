import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useProfile } from '@/hooks/queries/useProfile';
import { spacing } from '@/lib/theme';

function formatTodayLabel(): string {
  return new Intl.DateTimeFormat('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
}

/** Conteúdo à esquerda do header no ecrã Início */
export function DashboardHeaderLeading() {
  const { data: profile } = useProfile();

  const firstName = profile?.name?.split(' ')[0] ?? 'Utilizador';
  const today = formatTodayLabel();

  return (
    <View style={styles.container}>
      <Text variant="h3">Olá, {firstName}</Text>
      <Text variant="caption" color="textSecondary" style={styles.capitalize}>
        {today}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  capitalize: {
    textTransform: 'capitalize',
  },
});
