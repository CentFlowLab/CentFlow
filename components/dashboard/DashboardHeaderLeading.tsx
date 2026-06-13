import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import { useProfile } from '@/hooks/queries/useProfile';
import { getHomeContextualMessage } from '@/lib/onboarding/personalization';
import { formatDateLong } from '@/lib/utils/format';
import { spacing } from '@/lib/theme';

/** Conteúdo à esquerda do header no ecrã Início */
export function DashboardHeaderLeading() {
  const { data: profile } = useProfile();
  const { data: onboardingAnswers } = useOnboardingAnswers();

  const firstName = profile?.name?.split(' ')[0] ?? 'Utilizador';
  const contextual = getHomeContextualMessage(
    onboardingAnswers?.completed ? onboardingAnswers : null,
  );

  return (
    <View style={styles.container}>
      <Text variant="h3">Olá, {firstName}</Text>
      {contextual ? (
        <Text variant="caption" color="textSecondary" style={styles.contextual}>
          {contextual}
        </Text>
      ) : (
        <Text variant="caption" color="textMuted">
          {formatDateLong()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  contextual: {
    lineHeight: 18,
    maxWidth: 260,
  },
});
