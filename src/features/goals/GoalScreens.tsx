import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useCallback, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  calendarDateToLocalDate,
  goalEvolution,
  goalStatus,
  hasErrors,
  validateGoalContributionInput,
  ValidationError,
  type GoalContribution,
  type SavingsGoal,
} from '@/core/finance';
import {
  amountToInputString,
  decimalSeparatorFor,
  DEFAULT_CURRENCY,
  parseAmountInput,
} from '@/core/money';
import { useDataQuery, useRepositories, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Amount,
  BarChart,
  Button,
  CalendarPicker,
  Card,
  Chip,
  ChipGroup,
  Dialog,
  Divider,
  EmptyState,
  FormScreen,
  Icon,
  IconButton,
  ProgressBar,
  Text,
  TextField,
} from '@/ui/components';
import { categorySwatch, spacing, useTheme } from '@/ui/theme';

import { closeModal } from '../finance/navigation';
import { validationMessage } from '../finance/presentation';
import { useToday } from '../finance/useToday';
import { GoalForm } from './GoalForm';
import { DEFAULT_GOAL_COLOR, DEFAULT_GOAL_ICON, GoalIcon } from './GoalIcon';

async function loadDetail(repositories: Repositories, id: string) {
  const [goal, contributions, transfers, accounts] = await Promise.all([
    repositories.goals.get(id),
    repositories.goals.listContributions(id),
    repositories.goals.linkableTransfers(id),
    repositories.accounts.list(),
  ]);
  return { goal, contributions, transfers, accounts };
}

export function NewGoalScreen() {
  return <GoalForm />;
}

export function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const { formatDate, formatMoney, formatMonthYear, formatPercent, locale } = useLocaleFormat();
  const today = useToday();
  const repositories = useRepositories();
  const [editing, setEditing] = useState(false);
  const [confirmingGoal, setConfirmingGoal] = useState(false);
  const [confirmingContribution, setConfirmingContribution] = useState<string | null>(null);
  // Contribuição em edição (null = nova).
  const [editingContribution, setEditingContribution] = useState<GoalContribution | null>(null);
  const [amountText, setAmountText] = useState('');
  const [date, setDate] = useState(today);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string>();
  const [dateError, setDateError] = useState<string>();
  const [linkError, setLinkError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const query = useDataQuery(useCallback((repos: Repositories) => loadDetail(repos, id), [id]));
  const goal = query.data?.goal;

  if (editing && goal) {
    return (
      <GoalForm goal={goal} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} />
    );
  }

  const resetContribution = () => {
    setEditingContribution(null);
    setAmountText('');
    setDate(today);
    setEntryId(null);
    setAmountError(undefined);
    setDateError(undefined);
    setLinkError(undefined);
  };

  const startEditing = (current: SavingsGoal, contribution: GoalContribution) => {
    setEditingContribution(contribution);
    setAmountText(
      amountToInputString(contribution.amount, current.currency, decimalSeparatorFor(locale)),
    );
    setDate(contribution.date);
    setEntryId(contribution.entryId);
    setAmountError(undefined);
    setDateError(undefined);
    setLinkError(undefined);
  };

  async function saveContribution(current: SavingsGoal) {
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
    const input = { goalId: current.id, amount: parsed.amountMinor, date, entryId };
    const fieldErrors = validateGoalContributionInput(input);
    if (hasErrors(fieldErrors)) {
      setDateError(validationMessage(t, fieldErrors.date));
      return;
    }
    setSaving(true);
    try {
      if (editingContribution) {
        await repositories.goals.updateContribution(editingContribution.id, input);
      } else {
        await repositories.goals.addContribution(input);
      }
      setSaving(false);
      resetContribution();
    } catch (error) {
      setSaving(false);
      if (error instanceof ValidationError) {
        setDateError(validationMessage(t, error.errors.date));
        setAmountError(validationMessage(t, error.errors.amount));
        setLinkError(validationMessage(t, error.errors.entryId));
      }
    }
  }

  const contributions = query.data?.contributions ?? [];
  const accounts = query.data?.accounts ?? [];
  const accountName = (accountId: string | null) =>
    accounts.find((account) => account.id === accountId)?.name ?? null;
  const status = goal ? goalStatus(goal.targetAmount, contributions) : null;
  const money = (amountMinor: number) =>
    formatMoney({ amountMinor, currency: goal?.currency ?? DEFAULT_CURRENCY });
  const day = (value: string) => formatDate(calendarDateToLocalDate(value), 'medium');
  // A transferência já ligada a esta contribuição também é uma escolha válida.
  const linkedNow = editingContribution?.entryId ?? null;
  const transferChoices = query.data?.transfers ?? [];
  const evolution = goalEvolution(contributions).slice(-12);
  const swatch = categorySwatch(goal?.color ?? DEFAULT_GOAL_COLOR, scheme);

  return (
    <FormScreen
      title={goal?.name ?? t('goals.detailTitle')}
      closeLabel={t('common.close')}
      onClose={() => closeModal('/goals')}
      footer={
        goal ? (
          <View style={styles.actions}>
            <Button label={t('goals.changeTarget')} onPress={() => setEditing(true)} />
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
      ) : !goal || !status ? (
        <EmptyState icon="search-outline" title={t('goals.notFoundTitle')} />
      ) : (
        <View style={styles.body}>
          <Card
            style={
              status.reached
                ? { backgroundColor: colors.positiveMuted, borderColor: colors.positive }
                : undefined
            }>
            <View style={styles.detail}>
              <View style={styles.headerRow}>
                <GoalIcon
                  icon={goal.icon ?? DEFAULT_GOAL_ICON}
                  color={goal.color ?? DEFAULT_GOAL_COLOR}
                  size={52}
                  done={status.reached}
                />
                <View style={styles.flex}>
                  <Text variant="title3">{goal.name}</Text>
                  {status.reached ? (
                    <Text variant="footnote" tone="positive">
                      {status.achievedOn
                        ? t('goals.completedOn', { date: day(status.achievedOn) })
                        : t('goals.completedBadge')}
                    </Text>
                  ) : (
                    <Text variant="footnote" tone="secondary">
                      {t('goals.percentDone', { percent: formatPercent(status.ratio, 0) })}
                    </Text>
                  )}
                </View>
              </View>
              {goal.description ? (
                <Text variant="callout" tone="secondary">
                  {goal.description}
                </Text>
              ) : null}
              <Text variant="footnote" tone="secondary">
                {t('goals.saved')}
              </Text>
              <Amount
                value={{ amountMinor: status.saved, currency: goal.currency }}
                variant="amountHero"
              />
              <ProgressBar
                progress={status.ratio}
                tone="positive"
                height={10}
                accessibilityLabel={t('goals.percentDone', {
                  percent: formatPercent(status.ratio, 0),
                })}
              />
              <View style={styles.figures}>
                <Figure label={t('goals.target')}>{money(goal.targetAmount)}</Figure>
                <Figure label={t('goals.remaining')}>{money(status.remaining)}</Figure>
                {status.surplus > 0 ? (
                  <Figure label={t('goals.completedBadge')}>
                    {t('goals.over', { amount: money(status.surplus) })}
                  </Figure>
                ) : null}
              </View>
              <Text variant="footnote" tone="tertiary">
                {[
                  t('goals.createdOn', { date: day(goal.createdAt.slice(0, 10)) }),
                  goal.targetOn
                    ? t('goals.dueOn', { date: day(goal.targetOn) })
                    : t('goals.noDate'),
                  accountName(goal.accountId)
                    ? t('goals.account', { name: accountName(goal.accountId) })
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </Card>

          <Card>
            <View style={styles.detail}>
              <Text variant="title3">{t('goals.evolution')}</Text>
              {evolution.length === 0 ? (
                <Text variant="callout" tone="secondary">
                  {t('goals.evolutionEmpty')}
                </Text>
              ) : (
                <BarChart
                  seriesColors={[swatch.foreground]}
                  height={110}
                  groups={evolution.map((month) => {
                    const label = new Intl.DateTimeFormat(locale, { month: 'short' })
                      .format(calendarDateToLocalDate(`${month.month}-01`))
                      .replace('.', '');
                    return {
                      key: month.month,
                      label,
                      values: [month.amount],
                      accessibilityLabel: `${formatMonthYear(calendarDateToLocalDate(`${month.month}-01`))}: ${money(month.amount)}, ${t(
                        'goals.savedShort',
                        { amount: money(month.cumulative) },
                      )}`,
                    };
                  })}
                />
              )}
            </View>
          </Card>

          <Card>
            <View style={styles.detail}>
              <Text variant="title3">
                {editingContribution ? t('goals.contributionEdit') : t('goals.contributionAdd')}
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
              <Text variant="label">{day(date)}</Text>
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
              <ChipGroup label={t('goals.linkTransfer')} errorText={linkError}>
                <Chip
                  label={t('goals.noLink')}
                  selected={entryId === null}
                  onPress={() => setEntryId(null)}
                />
                {linkedNow && !transferChoices.some((choice) => choice.id === linkedNow) ? (
                  <Chip
                    label={t('goals.linked')}
                    selected={entryId === linkedNow}
                    onPress={() => setEntryId(linkedNow)}
                  />
                ) : null}
                {transferChoices.map((transfer) => (
                  <Chip
                    key={transfer.id}
                    label={`${day(transfer.date)} · ${money(transfer.amount)}${
                      transfer.description ? ` · ${transfer.description}` : ''
                    }`}
                    selected={entryId === transfer.id}
                    onPress={() => {
                      setEntryId(transfer.id);
                      setLinkError(undefined);
                      // Sem valor escrito, a contribuição fica com o valor e a data da transferência.
                      if (amountText.trim() === '') {
                        setAmountText(
                          amountToInputString(
                            transfer.amount,
                            goal.currency,
                            decimalSeparatorFor(locale),
                          ),
                        );
                        setDate(transfer.date);
                      }
                    }}
                  />
                ))}
              </ChipGroup>
              {transferChoices.length === 0 && !linkedNow ? (
                <Text variant="footnote" tone="tertiary">
                  {t('goals.noTransfers')}
                </Text>
              ) : null}
              <Button
                label={
                  editingContribution ? t('goals.contributionSave') : t('goals.contributionAdd')
                }
                loading={saving}
                disabled={saving}
                onPress={() => void saveContribution(goal)}
              />
              {editingContribution ? (
                <Button label={t('common.cancel')} variant="ghost" onPress={resetContribution} />
              ) : null}
              <Text variant="caption" tone="tertiary">
                {t('goals.howItWorks')}
              </Text>
            </View>
          </Card>

          <Card padding="md">
            <View style={styles.history}>
              <Text variant="title3">{t('goals.contributions')}</Text>
              {contributions.length === 0 ? (
                <Text variant="callout" tone="secondary">
                  {t('goals.contributionEmpty')}
                </Text>
              ) : (
                contributions.map((item, index) => (
                  <Fragment key={item.id}>
                    {index > 0 ? <Divider /> : null}
                    <View style={styles.line}>
                      <View style={styles.flex}>
                        <Text variant="bodyStrong" tabular>
                          {money(item.amount)}
                        </Text>
                        <View style={styles.inline}>
                          <Text variant="footnote" tone="secondary">
                            {day(item.date)}
                          </Text>
                          {item.entryId ? (
                            <>
                              <Icon name="link-outline" size={14} color="textSecondary" />
                              <Text variant="footnote" tone="secondary">
                                {t('goals.linked')}
                              </Text>
                            </>
                          ) : null}
                        </View>
                      </View>
                      <IconButton
                        icon="create-outline"
                        accessibilityLabel={t('goals.contributionEdit')}
                        onPress={() => startEditing(goal, item)}
                      />
                      <IconButton
                        icon="trash-outline"
                        accessibilityLabel={t('goals.contributionDelete')}
                        onPress={() => setConfirmingContribution(item.id)}
                      />
                    </View>
                  </Fragment>
                ))
              )}
            </View>
          </Card>
          <Text variant="caption" tone="tertiary">
            {t('goals.doesNotChangeBalances')}
          </Text>
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
              if (editingContribution?.id === contributionId) resetContribution();
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

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.figure}>
      <Text variant="footnote" tone="secondary">
        {label}
      </Text>
      <Text variant="bodyStrong" tabular>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  body: { gap: spacing.lg },
  detail: { gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  figures: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  figure: { gap: spacing.xs, minWidth: 110 },
  history: { gap: spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: 2 },
  inline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
});
