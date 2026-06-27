import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import { useProfile } from '@/hooks/queries/useProfile';
import {
  getHomeContextualMessage,
  getPersonalizedHomeSubtitle,
} from '@/lib/onboarding/personalization';
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
  const { data: answers } = useOnboardingAnswers();

  const firstName = profile?.name?.split(' ')[0] ?? 'Utilizador';
  const today = formatTodayLabel();
  const contextual = getHomeContextualMessage(answers ?? null);
  const subtitle = getPersonalizedHomeSubtitle(answers ?? null) ?? contextual;

  return (
    <View style={styles.container}>
      <Text variant="h3">Olá, {firstName}</Text>
      <Text variant="caption" color="textSecondary" style={styles.capitalize}>
        {today}
      </Text>
      {subtitle ? (
        <Text variant="caption" color="textMuted" style={styles.personalized}>
          {subtitle}
        </Text>
      ) : null}
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
  personalized: {
    marginTop: 2,
    lineHeight: 16,
  },
});
