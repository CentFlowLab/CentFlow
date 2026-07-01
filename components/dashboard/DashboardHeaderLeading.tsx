import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useAssets } from '@/hooks/queries/useAssets';
import { useHomeScreenData } from '@/hooks/queries/useHomeScreenData';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import { useProfile } from '@/hooks/queries/useProfile';
import { useMonthlySpendable } from '@/hooks/useMonthlySpendable';
import { getHomeMotivationPhrase } from '@/lib/domain/home-motivation';
import {
  getHomeContextualMessage,
  getPersonalizedHomeSubtitle,
} from '@/lib/onboarding/personalization';
import { spacing } from '@/lib/theme';

/** Conteúdo à esquerda do header no ecrã Início */
export function DashboardHeaderLeading() {
  const { data: profile } = useProfile();
  const { data: answers } = useOnboardingAnswers();
  const { data: homeData } = useHomeScreenData();
  const { data: assets } = useAssets();
  const spendable = useMonthlySpendable();

  const firstName = profile?.name?.split(' ')[0] ?? 'Utilizador';
  const motivation = getHomeMotivationPhrase({
    spendable,
    attentionItems: homeData?.attentionItems ?? [],
    activeGoalsCount: assets?.goals.length ?? 0,
  });
  const contextual = getHomeContextualMessage(answers ?? null);
  const subtitle = getPersonalizedHomeSubtitle(answers ?? null) ?? contextual;

  return (
    <View style={styles.container}>
      <Text variant="h3">Olá, {firstName}</Text>
      <Text variant="caption" color="textSecondary">
        {motivation}
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
  personalized: {
    marginTop: 2,
    lineHeight: 16,
  },
});
