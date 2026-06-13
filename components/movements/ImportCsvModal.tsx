import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, Text } from '@/components/ui';
import { useImportCsv } from '@/hooks/useImportCsv';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { CsvParseResult } from '@/lib/csv/csv-import.types';
import { parseTransactionsCsv } from '@/lib/csv/parse-transactions-csv';
import { pickCsvFile } from '@/lib/csv/read-csv-file';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

const PREVIEW_LIMIT = 8;

type ImportCsvModalProps = {
  visible: boolean;
  onClose: () => void;
};

type Step = 'pick' | 'preview' | 'done';

export function ImportCsvModal({ visible, onClose }: ImportCsvModalProps) {
  const importMutation = useImportCsv();

  const [step, setStep] = useState<Step>('pick');
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    if (!visible) return;

    setStep('pick');
    setParseResult(null);
    setPickError(null);
    setIsPicking(false);
    setImportError(null);
    setImportedCount(0);
    setFailedCount(0);
    importMutation.reset();
  }, [visible, importMutation]);

  async function handlePickFile() {
    setPickError(null);
    setIsPicking(true);

    try {
      const file = await pickCsvFile();
      if (!file) {
        setIsPicking(false);
        return;
      }

      const parsed = parseTransactionsCsv(file.text, file.name);
      setParseResult(parsed);

      if (parsed.validRows.length > 0 || parsed.errors.length > 0) {
        setStep('preview');
      } else {
        setPickError(parsed.errors[0] ?? 'Não foi possível ler o CSV.');
      }
    } catch (error) {
      setPickError(getApiErrorMessage(error, 'a leitura do ficheiro'));
    } finally {
      setIsPicking(false);
    }
  }

  async function handleImport() {
    if (!parseResult || parseResult.validRows.length === 0) return;

    setImportError(null);

    try {
      const result = await importMutation.mutateAsync(parseResult.validRows);
      setImportedCount(result.imported);
      setFailedCount(result.failed);

      if (result.imported === 0) {
        setImportError('Nenhum movimento foi importado. Verifica os dados e tenta novamente.');
        return;
      }

      setStep('done');
    } catch (error) {
      setImportError(getApiErrorMessage(error, 'a importação'));
    }
  }

  function handleClose() {
    onClose();
  }

  const previewRows = parseResult?.validRows.slice(0, PREVIEW_LIMIT) ?? [];
  const remainingPreview =
    (parseResult?.validRows.length ?? 0) - previewRows.length;

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={handleClose}
      header={(requestClose) => (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="h2">Importar CSV</Text>
            <Text variant="caption" color="textMuted">
              Alternativa temporária ao Open Banking
            </Text>
          </View>
          <Pressable
            onPress={requestClose}
            hitSlop={12}
            accessibilityLabel="Fechar"
            style={styles.closeButton}>
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              tintColor={colors.textMuted}
              size={20}
            />
          </Pressable>
        </View>
      )}>
      {step === 'pick' ? (
        <View style={styles.section}>
          <Card variant="outlined" padding="md">
            <Text variant="body" style={styles.helpText}>
              Exporta movimentos do teu banco em CSV com as colunas{' '}
              <Text variant="bodyMedium">Data</Text>,{' '}
              <Text variant="bodyMedium">Descrição</Text>,{' '}
              <Text variant="bodyMedium">Valor</Text> e opcionalmente{' '}
              <Text variant="bodyMedium">Tipo</Text> (receita/despesa).
            </Text>
            <Text variant="caption" color="textMuted" style={styles.example}>
              Exemplo: Data;Descrição;Valor;Tipo
            </Text>
          </Card>

          {pickError ? (
            <Card variant="outlined" padding="md" style={styles.errorCard}>
              <Text variant="body" color="danger">
                {pickError}
              </Text>
            </Card>
          ) : null}

          <Button
            label={isPicking ? 'A ler ficheiro...' : 'Escolher ficheiro CSV'}
            onPress={handlePickFile}
            loading={isPicking}
            fullWidth
            icon={
              <SymbolView
                name={{
                  ios: 'doc.text',
                  android: 'description',
                  web: 'description',
                }}
                tintColor={colors.textInverse}
                size={18}
              />
            }
          />
        </View>
      ) : null}

      {step === 'preview' && parseResult ? (
        <View style={styles.section}>
          <Card variant="elevated" padding="md">
            <Text variant="bodyMedium">{parseResult.fileName}</Text>
            <Text variant="caption" color="textMuted">
              Delimitador: {parseResult.delimiter === ';' ? 'ponto e vírgula' : 'vírgula'}
            </Text>
            <View style={styles.statsRow}>
              <StatBadge
                label="Válidas"
                value={parseResult.validRows.length}
                tone="success"
              />
              <StatBadge
                label="Com erro"
                value={parseResult.invalidRows.length}
                tone={parseResult.invalidRows.length > 0 ? 'danger' : 'muted'}
              />
            </View>
          </Card>

          {parseResult.errors.length > 0 ? (
            <Card variant="outlined" padding="md" style={styles.errorCard}>
              {parseResult.errors.map((message, errorIndex) => (
                <Text
                  key={`file-error-${errorIndex}`}
                  variant="caption"
                  color="danger"
                  style={styles.errorLine}>
                  {message}
                </Text>
              ))}
            </Card>
          ) : null}

          {previewRows.length > 0 ? (
            <View>
              <Text variant="label" color="textMuted" style={styles.sectionLabel}>
                Pré-visualização
              </Text>
              {previewRows.map((row) => (
                <Card key={row.lineNumber} variant="outlined" padding="md" style={styles.previewRow}>
                  <View style={styles.previewMain}>
                    <Text variant="body" numberOfLines={1}>
                      {row.description}
                    </Text>
                    <Text
                      variant="bodyMedium"
                      color={row.type === 'income' ? 'success' : 'text'}>
                      {row.type === 'income' ? '+' : '-'}
                      {formatCurrency(row.amount)}
                    </Text>
                  </View>
                  <Text variant="caption" color="textMuted">
                    {formatDateShort(row.date)} ·{' '}
                    {row.type === 'income' ? 'Receita' : 'Despesa'}
                  </Text>
                </Card>
              ))}
              {remainingPreview > 0 ? (
                <Text variant="caption" color="textMuted" align="center">
                  +{remainingPreview} movimento{remainingPreview === 1 ? '' : 's'} válido
                  {remainingPreview === 1 ? '' : 's'}
                </Text>
              ) : null}
            </View>
          ) : null}

          {parseResult.invalidRows.length > 0 ? (
            <View>
              <Text variant="label" color="textMuted" style={styles.sectionLabel}>
                Linhas ignoradas
              </Text>
              {parseResult.invalidRows.slice(0, 5).map((row) => (
                <Text
                  key={row.lineNumber}
                  variant="caption"
                  color="danger"
                  style={styles.errorLine}>
                  Linha {row.lineNumber}: {row.error}
                </Text>
              ))}
              {parseResult.invalidRows.length > 5 ? (
                <Text variant="caption" color="textMuted">
                  +{parseResult.invalidRows.length - 5} erros adicionais
                </Text>
              ) : null}
            </View>
          ) : null}

          {importError ? (
            <Card variant="outlined" padding="md" style={styles.errorCard}>
              <Text variant="body" color="danger">
                {importError}
              </Text>
            </Card>
          ) : null}

          <View style={styles.actions}>
            <Button
              label="Escolher outro ficheiro"
              variant="secondary"
              onPress={() => {
                setStep('pick');
                setParseResult(null);
                setImportError(null);
              }}
              disabled={importMutation.isPending}
            />
            <Button
              label={
                importMutation.isPending
                  ? 'A importar...'
                  : `Importar ${parseResult.validRows.length} movimento${
                      parseResult.validRows.length === 1 ? '' : 's'
                    }`
              }
              onPress={handleImport}
              loading={importMutation.isPending}
              disabled={parseResult.validRows.length === 0}
              fullWidth
            />
          </View>
        </View>
      ) : null}

      {step === 'done' ? (
        <View style={styles.section}>
          <Card variant="elevated" padding="lg" style={styles.doneCard}>
            <SymbolView
              name={{
                ios: 'checkmark.circle.fill',
                android: 'check_circle',
                web: 'check_circle',
              }}
              tintColor={colors.success}
              size={40}
            />
            <Text variant="h2" align="center" style={styles.doneTitle}>
              Importação concluída
            </Text>
            <Text variant="body" color="textMuted" align="center">
              {importedCount} movimento{importedCount === 1 ? '' : 's'} adicionado
              {importedCount === 1 ? '' : 's'} à tua lista.
              {failedCount > 0
                ? ` ${failedCount} falhou${failedCount === 1 ? '' : 'ram'}.`
                : ''}
            </Text>
          </Card>
          <Button label="Fechar" onPress={handleClose} fullWidth />
        </View>
      ) : null}
    </DraggableBottomSheet>
  );
}

type StatBadgeProps = {
  label: string;
  value: number;
  tone: 'success' | 'danger' | 'muted';
};

function StatBadge({ label, value, tone }: StatBadgeProps) {
  const toneColor =
    tone === 'success' ? colors.success : tone === 'danger' ? colors.danger : colors.textMuted;

  return (
    <View style={styles.statBadge}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Text variant="h2" style={{ color: toneColor }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  section: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  helpText: {
    lineHeight: 22,
  },
  example: {
    marginTop: spacing.sm,
  },
  errorCard: {
    borderColor: colors.dangerMuted,
    backgroundColor: colors.dangerMuted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  statBadge: {
    gap: spacing.xs,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  previewRow: {
    marginBottom: spacing.sm,
  },
  previewMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  errorLine: {
    marginBottom: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  doneCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  doneTitle: {
    marginTop: spacing.sm,
  },
});
