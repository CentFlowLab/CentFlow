import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import {
  calendarDateToLocalDate,
  DEFAULT_CATEGORIES,
  ValidationError,
  type Account,
  type Category,
  type EntryInput,
  suggestionFor,
} from '@/core/finance';
import {
  findLikelyDuplicates,
  parseStatementCsv,
  type StatementParseError,
  type StatementRow,
} from '@/core/import';
import { useDataQuery, useRepositories, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Amount,
  Badge,
  Button,
  Card,
  Chip,
  ChipGroup,
  Divider,
  EmptyState,
  FormScreen,
  Icon,
  Text,
  TextField,
} from '@/ui/components';
import { radius, spacing, useTheme } from '@/ui/theme';

import { closeModal } from '../finance/navigation';
import { existingMovements } from './existing-movements';
import { useFinanceLookups } from '../finance/useFinanceLookups';
import { pickStatementFile } from './pick-statement-file';

const OTHER_EXPENSE_ID = DEFAULT_CATEGORIES.find((category) => category.key === 'otherExpense')?.id;
const OTHER_INCOME_ID = DEFAULT_CATEGORIES.find((category) => category.key === 'otherIncome')?.id;

type Preview = { rows: StatementRow[]; skipped: number[]; duplicates: Set<number> };
type ScreenError = StatementParseError | 'noRows' | 'saveFailed' | 'readFailed';

/** Movimentos da conta no intervalo, vistos do lado da conta (transferências incluídas). */
function defaultCategory(list: readonly Category[], type: Category['type'], preferred?: string) {
  const ofType = list.filter((category) => category.type === type);
  return (ofType.find((category) => category.id === preferred) ?? ofType[0])?.id ?? null;
}

export function ImportStatementScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const repositories = useRepositories();
  const { formatDate } = useLocaleFormat();
  const lookups = useFinanceLookups();
  // Histórico de descrições: cada linha usa a categoria habitual dessa descrição, se for clara.
  const history = useDataQuery(
    useCallback(
      (repos: Repositories) => repos.entries.history({ since: '1900-01-01', limit: 5000 }),
      [],
    ),
  );

  const [accountId, setAccountId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [included, setIncluded] = useState<Set<number>>(new Set());
  const [expenseCategoryId, setExpenseCategoryId] = useState<string | null>(null);
  const [incomeCategoryId, setIncomeCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<ScreenError | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => closeModal('/transactions');
  const shell = (children: React.ReactNode, footer?: React.ReactNode) => (
    <FormScreen
      title={t('statementImport.title')}
      closeLabel={t('common.close')}
      onClose={close}
      footer={footer}>
      {children}
    </FormScreen>
  );

  if (!lookups.data) {
    return shell(<ActivityIndicator color={colors.primary} style={styles.loading} />);
  }

  const accounts = lookups.data.accountList.filter((account) => !account.archivedAt);
  if (accounts.length === 0) {
    return shell(<EmptyState icon="wallet-outline" title={t('statementImport.noAccounts')} />);
  }
  const account: Account = accounts.find((item) => item.id === accountId) ?? accounts[0]!;
  const categories = lookups.data.categoryList;
  const expenseCategory =
    expenseCategoryId ?? defaultCategory(categories, 'expense', OTHER_EXPENSE_ID);
  const incomeCategory = incomeCategoryId ?? defaultCategory(categories, 'income', OTHER_INCOME_ID);

  const buildPreview = async (content: string) => {
    setError(null);
    const parsed = parseStatementCsv(content, account.currency);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    if (parsed.rows.length === 0) {
      setError('noRows');
      return;
    }
    setBusy(true);
    try {
      const existing = await existingMovements(repositories, account.id, parsed.rows);
      const duplicates = findLikelyDuplicates(parsed.rows, existing);
      setPreview({ rows: parsed.rows, skipped: parsed.skipped, duplicates });
      setIncluded(
        new Set(parsed.rows.filter((row) => !duplicates.has(row.line)).map((row) => row.line)),
      );
    } finally {
      setBusy(false);
    }
  };

  const pickFile = async () => {
    setError(null);
    const picked = await pickStatementFile();
    if (!picked.ok) {
      if (picked.reason === 'readFailed') setError('readFailed');
      return;
    }
    setText(picked.text);
    await buildPreview(picked.text);
  };

  const confirm = async () => {
    if (!preview) return;
    const selected = preview.rows.filter((row) => included.has(row.line));
    const inputs: EntryInput[] = selected.map((row) => ({
      type: row.type,
      amount: row.amount,
      description: row.description,
      categoryId:
        suggestionFor(history.data ?? [], row.description, row.type)?.categoryId ??
        (row.type === 'expense' ? expenseCategory : incomeCategory),
      accountId: account.id,
      destinationAccountId: null,
      date: row.date,
      notes: null,
    }));
    setBusy(true);
    setError(null);
    try {
      await repositories.entries.createMany(inputs);
      close();
    } catch (cause) {
      // Só o tipo do erro: a mensagem pode citar dados do extrato.
      console.error(
        `[import] save failed: ${cause instanceof ValidationError ? 'validation' : 'other'}`,
      );
      setError('saveFailed');
    } finally {
      setBusy(false);
    }
  };

  const errorText = error
    ? error === 'readFailed'
      ? t('statementImport.readFailed')
      : t(`statementImport.errors.${error}`)
    : null;

  const accountPicker = (
    <ChipGroup label={t('statementImport.account')}>
      {accounts.map((item) => (
        <Chip
          key={item.id}
          label={`${item.name} · ${item.currency}`}
          selected={item.id === account.id}
          disabled={preview !== null}
          onPress={() => setAccountId(item.id)}
        />
      ))}
    </ChipGroup>
  );

  if (!preview) {
    return shell(
      <View style={styles.stack}>
        <Text variant="callout" tone="secondary">
          {t('statementImport.intro')}
        </Text>
        {accountPicker}
        <Button
          label={t('statementImport.pickFile')}
          icon="document-text-outline"
          variant="secondary"
          loading={busy}
          onPress={pickFile}
        />
        <TextField
          label={t('statementImport.pasteLabel')}
          placeholder={t('statementImport.pastePlaceholder')}
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={6}
          autoCorrect={false}
          autoCapitalize="none"
          inputStyle={styles.paste}
        />
        {errorText ? (
          <Text variant="callout" tone="negative" accessibilityLiveRegion="polite">
            {errorText}
          </Text>
        ) : null}
      </View>,
      <Button
        label={t('statementImport.preview')}
        onPress={() => buildPreview(text)}
        disabled={text.trim() === '' || busy}
        loading={busy}
        fullWidth
      />,
    );
  }

  const selectedCount = preview.rows.filter((row) => included.has(row.line)).length;
  const hasExpenses = preview.rows.some((row) => row.type === 'expense');
  const hasIncome = preview.rows.some((row) => row.type === 'income');
  const toggle = (line: number) =>
    setIncluded((current) => {
      const next = new Set(current);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });

  return shell(
    <View style={styles.stack}>
      {accountPicker}
      <Card style={styles.summary}>
        <Text variant="bodyStrong" accessibilityLiveRegion="polite">
          {t('statementImport.found', { count: preview.rows.length })}
        </Text>
        {preview.duplicates.size > 0 ? (
          <Text variant="footnote" tone="warning">
            {t('statementImport.duplicates', { count: preview.duplicates.size })}
          </Text>
        ) : null}
        {preview.skipped.length > 0 ? (
          <Text variant="footnote" tone="secondary">
            {t('statementImport.skipped', { lines: preview.skipped.join(', ') })}
          </Text>
        ) : null}
      </Card>
      <Text variant="footnote" tone="tertiary">
        {t('statementImport.categoryFromHistory')}
      </Text>
      {hasExpenses ? (
        <ChipGroup label={t('statementImport.expenseCategory')}>
          {categories
            .filter((category) => category.type === 'expense')
            .map((category) => (
              <Chip
                key={category.id}
                label={category.name}
                selected={category.id === expenseCategory}
                onPress={() => setExpenseCategoryId(category.id)}
              />
            ))}
        </ChipGroup>
      ) : null}
      {hasIncome ? (
        <ChipGroup label={t('statementImport.incomeCategory')}>
          {categories
            .filter((category) => category.type === 'income')
            .map((category) => (
              <Chip
                key={category.id}
                label={category.name}
                selected={category.id === incomeCategory}
                onPress={() => setIncomeCategoryId(category.id)}
              />
            ))}
        </ChipGroup>
      ) : null}
      <Card padding="xs">
        {preview.rows.map((row, index) => {
          const checked = included.has(row.line);
          const duplicate = preview.duplicates.has(row.line);
          const description = row.description || t('statementImport.noDescription');
          const date = formatDate(calendarDateToLocalDate(row.date), 'medium');
          return (
            <View key={row.line}>
              {index > 0 ? <Divider inset={spacing.lg + 28 + spacing.md} /> : null}
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={`${description}, ${date}${duplicate ? `, ${t('statementImport.duplicate')}` : ''}`}
                onPress={() => toggle(row.line)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { backgroundColor: colors.surfaceHover },
                ]}>
                <View
                  style={[
                    styles.check,
                    {
                      borderColor: checked ? colors.primary : colors.borderStrong,
                      backgroundColor: checked ? colors.primary : 'transparent',
                    },
                  ]}>
                  {checked ? <Icon name="checkmark" size={16} color="onPrimary" /> : null}
                </View>
                <View style={styles.rowText}>
                  <Text variant="label" numberOfLines={1}>
                    {description}
                  </Text>
                  <Text variant="caption" tone="secondary">
                    {date}
                  </Text>
                  {duplicate ? (
                    <Badge label={t('statementImport.duplicate')} tone="warning" />
                  ) : null}
                </View>
                <Amount
                  value={{
                    amountMinor: row.type === 'expense' ? -row.amount : row.amount,
                    currency: account.currency,
                  }}
                  variant="label"
                  coloring="signed"
                />
              </Pressable>
            </View>
          );
        })}
      </Card>
      {errorText ? (
        <Text variant="callout" tone="negative" accessibilityLiveRegion="polite">
          {errorText}
        </Text>
      ) : null}
    </View>,
    <View style={styles.footer}>
      <Button
        label={t('statementImport.confirm', { count: selectedCount })}
        onPress={confirm}
        disabled={selectedCount === 0 || busy}
        loading={busy}
        fullWidth
      />
      <Button
        label={t('statementImport.back')}
        variant="ghost"
        onPress={() => {
          setPreview(null);
          setError(null);
        }}
        fullWidth
      />
    </View>,
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: spacing['4xl'] },
  stack: { gap: spacing.lg },
  paste: { minHeight: 120, textAlignVertical: 'top' },
  summary: { gap: spacing.xs },
  footer: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: spacing.xxs, alignItems: 'flex-start' },
});
