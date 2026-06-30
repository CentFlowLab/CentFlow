import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useHomeScreenData } from '@/hooks/queries/useHomeScreenData';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import { useProfile } from '@/hooks/queries/useProfile';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { estimateMonthlyCashflow } from '@/lib/domain/financial';
import { logAppError } from '@/lib/diagnostics';
import { getHomeDailyMessage } from '@/lib/insights/home-daily-message';
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
  const { data: home } = useHomeScreenData();
  const { data: transactions = [] } = useTransactions('all');

  const firstName = profile?.name?.split(' ')[0] ?? 'Utilizador';
  const today = formatTodayLabel();
  const { income, expenses } = estimateMonthlyCashflow(transactions);
  const budget = answers?.monthlyIncome ?? income;
  const budgetUsedPercent = budget > 0 ? (expenses / budget) * 100 : undefined;
  const monthlySavingsRate = income > 0 ? (income - expenses) / income : 0;

  const dailyMessage = (() => {
    try {
      return getHomeDailyMessage({
        budgetUsedPercent,
        daysToGoal: null,
        monthlySavingsRate,
        cashflowNegative: expenses > income && income > 0,
        primaryGoalLabel: home?.featuredGoal?.name,
      });
    } catch (error) {
      logAppError('home-daily-message', error);
      return 'Continua a registar movimentos para insights personalizados.';
    }
  })();

  return (
    <View style={styles.container}>
      <Text variant="h3">Olá, {firstName}</Text>
      <Text variant="caption" color="textSecondary" style={styles.capitalize}>
        {today}
      </Text>
      <Text variant="caption" color="textMuted" style={styles.personalized}>
        {dailyMessage}
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
  personalized: {
    marginTop: 2,
    lineHeight: 16,
  },
});
