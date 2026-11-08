import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  calendarDateToLocalDate,
  remainingAmountMinor,
  savedAmountMinor,
  validateGoalContributionInput,
  ValidationError,
  hasErrors,
  type GoalContributionInput,
  type SavingsGoal,
} from '@/core/finance';
import { DEFAULT_CURRENCY, parseAmountInput } from '@/core/money';
import { useDataQuery, useRepositories, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Amount,
  Button,
  CalendarPicker,
  Card,
  Dialog,
  EmptyState,
  FormScreen,
  IconButton,
  ListItem,
  ProgressBar,
  Text,
  TextField,
} from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

import { closeModal } from '../finance/navigation';
import { validationMessage } from '../finance/presentation';
import { useToday } from '../finance/useToday';
import { GoalForm } from './GoalForm';

async function loadDetail(repositories: Repositories, id: string) {
  const [goal, contributions] = await Promise.all([
    repositories.goals.get(id),
    repositories.goals.listContributions(id),
  ]);
  return { goal, contributions };
}

export function NewGoalScreen() {
  return <GoalForm />;
}

export function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDate, formatMoney, locale } = useLocaleFormat();
  const today = useToday();
  const repositories = useRepositories();
  const [editing, setEditing] = useState(false);
  const [confirmingGoal, setConfirmingGoal] = useState(false);
  const [confirmingContribution, setConfirmingContribution] = useState<string | null>(null);
  const [amountText, setAmountText] = useState('');
  const [date, setDate] = useState(today);
  const [amountError, setAmountError] = useState<string>();
  const [dateError, setDateError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const query = useDataQuery(useCallback((repos: Repositories) => loadDetail(repos, id), [id]));
  const goal = query.data?.goal;

  if (editing && goal) {
    return (
      <GoalForm goal={goal} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} />
    );
  }

  async function addContribution(current: SavingsGoal) {
    const parsed = parseAmountInput(amountText, current.currency || DEFAULT_CURRENCY);
    if (!parsed.ok) {
      setAmountError(
        t(
          parsed.error === 'empty'
            ? 'validation.amountEmpty'
            : parsed.error === 'tooLarge'
              ? 'validation.amountTooLarge'
              : 'validation.amountInvalid',
        ),
      );
      return;
    }
    const input: GoalContributionInput = { goalId: current.id, amount: parsed.amountMinor, date };
    const fieldErrors = validateGoalContributionInput(input);
    if (hasErrors(fieldErrors)) {
      setDateError(validationMessage(t, fieldErrors.date));
      return;
    }
    setSaving(true);
    try {
      await repositories.goals.addContribution(input);
      setAmountText('');
      setAmountError(undefined);
      setDateError(undefined);
      setSaving(false);
    } catch (error) {
      setSaving(false);
      if (error instanceof ValidationError) setDateError(validationMessage(t, error.errors.date));
    }
  }

  const contributions = query.data?.contributions ?? [];
  const savedMinor = savedAmountMinor(contributions.map((item) => item.amount));
  const reached = goal ? savedMinor >= goal.targetAmount : false;

  return (
    <FormScreen
      title={goal?.name ?? t('goals.detailTitle')}
      closeLabel={t('common.close')}
      onClose={() => closeModal('/goals')}
      footer={
        goal ? (
          <View style={styles.actions}>
            <Button label={t('goals.edit')} onPress={() => setEditing(true)} />
            <Button
              label={t('goals.delete')}
              variant="destructive"
              onPress={() => setConfirmingGoal(true)}
            />
          </View>
        ) : undefined
      }>
      {!query.data ? (
        query.status === 'error' ? (
          <EmptyState icon="alert-circle-outline" title={t('errors.loadFailed')} />
        ) : (
          <ActivityIndicator color={colors.primary} />
        )
      ) : !goal ? (
        <EmptyState icon="search-outline" title={t('goals.notFoundTitle')} />
      ) : (
        <View style={styles.body}>
          <Card>
            <View style={styles.detail}>
              <Text variant="footnote" tone="secondary">
                {t('goals.saved')}
              </Text>
              <Amount
                value={{ amountMinor: savedMinor, currency: goal.currency }}
                variant="amountHero"
              />
              <Text variant="callout" tone="secondary">
                {t('goals.target')}
              </Text>
              <Amount value={{ amountMinor: goal.targetAmount, currency: goal.currency }} />
              <ProgressBar
                progress={goal.targetAmount === 0 ? 0 : savedMinor / goal.targetAmount}
                tone={reached ? 'positive' : 'accent'}
                accessibilityLabel={
                  reached
                    ? t('goals.reached')
                    : `${t('goals.remaining')} ${formatMoney({
                        amountMinor: remainingAmountMinor(goal.targetAmount, savedMinor),
                        currency: goal.currency,
                      })}`
                }
              />
              <Text variant="callout">
                {goal.targetOn
                  ? formatDate(calendarDateToLocalDate(goal.targetOn), 'medium')
                  : t('goals.noDate')}
              </Text>
              {reached ? (
                <Text variant="callout" tone="positive">
                  {t('goals.reached')}
                </Text>
              ) : null}
              <Text variant="caption" tone="tertiary">
                {t('goals.doesNotChangeBalances')}
              </Text>
            </View>
          </Card>
          <Card>
            <View style={styles.detail}>
              <Text variant="title3">{t('goals.contributions')}</Text>
              <Text variant="caption" tone="tertiary">
                {t('goals.correctByDeleting')}
              </Text>
              <TextField
                label={t('goals.form.amount')}
                value={amountText}
                onChangeText={(text) => {
                  setAmountText(text);
                  setAmountError(undefined);
                }}
                placeholder={t('entryForm.amountPlaceholder')}
                keyboardType="decimal-pad"
                inputMode="decimal"
                helperText={goal.currency}
                errorText={amountError}
              />
              <Text variant="footnote" tone="secondary">
                {t('goals.form.date')}
              </Text>
              <Text variant="label">{formatDate(calendarDateToLocalDate(date), 'medium')}</Text>
              <CalendarPicker
                value={date}
                today={today}
                locale={locale}
                labels={{
                  previousMonth: t('calendar.previousMonth'),
                  nextMonth: t('calendar.nextMonth'),
                }}
                onChange={setDate}
              />
              {dateError ? (
                <Text variant="footnote" tone="negative">
                  {dateError}
                </Text>
              ) : null}
              <Button
                label={t('goals.contributionAdd')}
                loading={saving}
                disabled={saving}
                onPress={() => void addContribution(goal)}
              />
            </View>
          </Card>
          <Card padding="xs">
            {contributions.length === 0 ? (
              <Text variant="callout" tone="secondary" style={styles.empty}>
                {t('goals.contributionEmpty')}
              </Text>
            ) : (
              contributions.map((item) => (
                <ListItem
                  key={item.id}
                  title={formatDate(calendarDateToLocalDate(item.date), 'medium')}
                  icon="add-circle-outline"
                  trailing={
                    <View style={styles.row}>
                      <Amount value={{ amountMinor: item.amount, currency: goal.currency }} />
                      <IconButton
                        icon="trash-outline"
                        accessibilityLabel={t('goals.contributionDelete')}
                        onPress={() => setConfirmingContribution(item.id)}
                      />
                    </View>
                  }
                />
              ))
            )}
          </Card>
        </View>
      )}
      <Dialog
        visible={confirmingGoal}
        title={t('goals.deleteTitle')}
        message={t('goals.deleteMessage')}
        onDismiss={() => setConfirmingGoal(false)}
        actions={[
          {
            label: t('goals.delete'),
            variant: 'destructive',
            onPress: () => {
              setConfirmingGoal(false);
              if (!goal) return;
              void repositories.goals.delete(goal.id).then(
                () => closeModal('/goals'),
                () => router.back(),
              );
            },
          },
          { label: t('common.cancel'), variant: 'ghost', onPress: () => setConfirmingGoal(false) },
        ]}
      />
      <Dialog
        visible={confirmingContribution !== null}
        title={t('goals.contributionDeleteTitle')}
        message={t('goals.contributionDeleteMessage')}
        onDismiss={() => setConfirmingContribution(null)}
        actions={[
          {
            label: t('goals.contributionDelete'),
            variant: 'destructive',
            onPress: () => {
              const contributionId = confirmingContribution;
              setConfirmingContribution(null);
              if (!contributionId) return;
              void repositories.goals.deleteContribution(contributionId);
            },
          },
          {
            label: t('common.cancel'),
            variant: 'ghost',
            onPress: () => setConfirmingContribution(null),
          },
        ]}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  body: { gap: spacing.lg },
  detail: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  empty: { padding: spacing.lg },
});
