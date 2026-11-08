import { useCallback, useEffect, useState, type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { DEFAULT_CATEGORIES } from '@/core/finance';
import {
  RepositoriesProvider,
  toDatabaseUnavailableError,
  type DatabaseUnavailableReason,
  type Repositories,
} from '@/data';
import { openAppRepositories } from '@/data/open-app-database';
import { i18n } from '@/i18n';
import { Button, EmptyState } from '@/ui/components';
import { useTheme } from '@/ui/theme';

type State =
  | { status: 'opening' }
  | { status: 'ready'; repositories: Repositories }
  | { status: 'error'; reason: DatabaseUnavailableReason };

type Props = PropsWithChildren<{
  /** Injetável para testes. */
  open?: () => Promise<Repositories>;
}>;

async function openAndSeed(open: () => Promise<Repositories>): Promise<Repositories> {
  const repositories = await open();
  await repositories.categories.seedDefaults(
    DEFAULT_CATEGORIES.map((category) => ({
      ...category,
      name: i18n.t(`categories.defaults.${category.key}`),
    })),
  );
  return repositories;
}

/** Abre a base de dados local antes de mostrar a app; em caso de falha explica o motivo. */
export function DataGate({ open = openAppRepositories, children }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [state, setState] = useState<State>({ status: 'opening' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    openAndSeed(open).then(
      (repositories) => {
        if (active) setState({ status: 'ready', repositories });
      },
      (error: unknown) => {
        const { reason } = toDatabaseUnavailableError(error);
        // Só o motivo: a mensagem original pode incluir caminhos ou dados.
        const log = reason === 'otherTab' ? console.warn : console.error;
        log(`[database] open failed: ${reason}`);
        if (active) setState({ status: 'error', reason });
      },
    );
    return () => {
      active = false;
    };
  }, [open, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'opening' });
    setAttempt((value) => value + 1);
  }, []);

  if (state.status === 'ready') {
    return (
      <RepositoriesProvider repositories={state.repositories}>{children}</RepositoriesProvider>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {state.status === 'opening' ? (
        <ActivityIndicator color={colors.primary} accessibilityLabel={t('database.opening')} />
      ) : (
        <EmptyState
          icon={state.reason === 'otherTab' ? 'copy-outline' : 'alert-circle-outline'}
          title={t(`database.${state.reason}.title`)}
          description={t(`database.${state.reason}.description`)}>
          {state.reason === 'schemaTooNew' ? null : (
            <Button label={t('common.retry')} icon="refresh" onPress={retry} />
          )}
        </EmptyState>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
