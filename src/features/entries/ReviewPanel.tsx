import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  calendarDateToLocalDate,
  findCancellingPairs,
  findTransferCandidates,
  suggestionFor,
  type Entry,
  type EntryPair,
} from '@/core/finance';
import { useDataQuery, useRepositories, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import { appStorage } from '@/lib/storage/key-value-store';
import { Button, Card, Dialog, Text } from '@/ui/components';
import { spacing } from '@/ui/theme';

import type { FinanceLookups } from '../finance/useFinanceLookups';

/** "Não é transferência": guardado neste aparelho, por par de ids (ADR-082). */
const DISMISSED_KEY = 'review.notTransfer';
const pairKey = (pair: EntryPair) => `${pair.expenseId}:${pair.incomeId}`;

/** Histórico para sugerir categorias (calculado na hora, nunca guardado). */
export function useReviewHistory() {
  return useDataQuery(
    useCallback(
      (repositories: Repositories) =>
        repositories.entries.history({ since: '1900-01-01', limit: 5000 }),
      [],
    ),
  ).data;
}

/** Ações de um movimento por classificar: aplicar a sugestão (se houver) ou marcar como revisto. */
export function ReviewActions({
  entry,
  lookups,
  history,
}: {
  entry: Entry;
  lookups: FinanceLookups;
  history: ReturnType<typeof useReviewHistory>;
}) {
  const { t } = useTranslation();
  const repositories = useRepositories();
  if (!entry.needsReview || entry.type === 'transfer') return null;
  const suggestion = history ? suggestionFor(history, entry.description, entry.type) : null;
  const category =
    suggestion?.categoryId && suggestion.categoryId !== entry.categoryId
      ? lookups.categories.get(suggestion.categoryId)
      : undefined;
  return (
    <View style={styles.actions}>
      {category ? (
        <Button
          label={t('entries.review.apply', { category: category.name })}
          size="sm"
          variant="secondary"
          onPress={() => void repositories.entries.classify(entry.id, category.id)}
        />
      ) : null}
      <Button
        label={t('entries.review.markReviewed')}
        size="sm"
        variant="ghost"
        onPress={() => void repositories.entries.markReviewed([entry.id])}
      />
    </View>
  );
}

/**
 * Com o filtro "Por classificar": possíveis transferências entre contas próprias (convertidas só
 * por ação da pessoa), pares que se anulam na mesma conta e "Marcar todos como revistos".
 */
export function ReviewPanel({ entries, lookups }: { entries: Entry[]; lookups: FinanceLookups }) {
  const { t } = useTranslation();
  const { formatMoney, formatDate } = useLocaleFormat();
  const repositories = useRepositories();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [converting, setConverting] = useState<EntryPair | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    let alive = true;
    void appStorage
      .getItem(DISMISSED_KEY)
      .then((raw) => {
        if (alive && raw) setDismissed(new Set(JSON.parse(raw) as string[]));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const accounts = lookups.accountList;
  const candidates = findTransferCandidates(entries, accounts).filter(
    (pair) => !dismissed.has(pairKey(pair)),
  );
  const cancelling = findCancellingPairs(entries, accounts);
  const pending = entries.filter((entry) => entry.needsReview);

  const describe = (pair: EntryPair) => {
    const expense = byId.get(pair.expenseId)!;
    const income = byId.get(pair.incomeId)!;
    const from = lookups.accounts.get(expense.accountId);
    const to = lookups.accounts.get(income.accountId);
    return {
      from: from?.name ?? '—',
      to: to?.name ?? '—',
      amount: formatMoney({ amountMinor: expense.amount, currency: from?.currency ?? 'EUR' }),
      date: formatDate(calendarDateToLocalDate(expense.date), 'medium'),
    };
  };

  const dismiss = (pair: EntryPair) => {
    const next = new Set(dismissed).add(pairKey(pair));
    setDismissed(next);
    void appStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])).catch(() => undefined);
  };

  if (pending.length === 0) return null;
  return (
    <View style={styles.panel}>
      {candidates.map((pair) => {
        const text = describe(pair);
        return (
          <Card key={pairKey(pair)} padding="md">
            <View style={styles.card}>
              <Text variant="bodyStrong">{t('entries.review.transferTitle')}</Text>
              <Text variant="footnote" tone="secondary" tabular>
                {t('entries.review.transferBody', text)}
              </Text>
              <View style={styles.actions}>
                <Button
                  label={t('entries.review.convert')}
                  size="sm"
                  onPress={() => setConverting(pair)}
                />
                <Button
                  label={t('entries.review.notTransfer')}
                  size="sm"
                  variant="ghost"
                  onPress={() => dismiss(pair)}
                />
              </View>
            </View>
          </Card>
        );
      })}
      {cancelling.map((pair) => {
        const text = describe(pair);
        return (
          <Text key={pairKey(pair)} variant="footnote" tone="secondary">
            {t('entries.review.cancelling', {
              account: text.from,
              amount: text.amount,
              date: text.date,
            })}
          </Text>
        );
      })}
      <Button
        label={t('entries.review.markAll')}
        variant="secondary"
        size="sm"
        onPress={() => setMarkingAll(true)}
      />
      <Dialog
        visible={converting !== null}
        title={t('entries.review.convertTitle')}
        message={converting ? t('entries.review.convertMessage', describe(converting)) : ''}
        onDismiss={() => setConverting(null)}
        actions={[
          {
            label: t('entries.review.convert'),
            onPress: () => {
              const pair = converting;
              setConverting(null);
              if (pair) {
                void repositories.entries
                  .convertToTransfer(pair.expenseId, pair.incomeId)
                  .catch(() => undefined);
              }
            },
          },
          { label: t('common.cancel'), onPress: () => setConverting(null) },
        ]}
      />
      <Dialog
        visible={markingAll}
        title={t('entries.review.markAllTitle')}
        message={t('entries.review.markAllMessage', { count: pending.length })}
        onDismiss={() => setMarkingAll(false)}
        actions={[
          {
            label: t('entries.review.markAll'),
            onPress: () => {
              setMarkingAll(false);
              void repositories.entries.markReviewed(pending.map((entry) => entry.id));
            },
          },
          { label: t('common.cancel'), onPress: () => setMarkingAll(false) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: spacing.sm },
  card: { gap: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
