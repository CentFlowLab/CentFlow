import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { DEFAULT_CATEGORIES } from '@/core/finance';
import {
  ANONYMOUS_SPACE,
  closeLocalSpace,
  openLocalSpace,
  RepositoriesProvider,
  sameSpace,
  toDatabaseUnavailableError,
  type DatabaseUnavailableReason,
  type LocalSpace,
  type LocalStore,
} from '@/data';
import { i18n } from '@/i18n';
import { Button, EmptyState } from '@/ui/components';
import { useTheme } from '@/ui/theme';

type Opened = { space: LocalSpace; store: LocalStore };

type State =
  | { status: 'opening'; current: Opened | null }
  | { status: 'ready'; current: Opened }
  | { status: 'error'; reason: DatabaseUnavailableReason };

type Props = PropsWithChildren<{
  space?: LocalSpace;
  /** Injetáveis para testes. */
  open?: (space: LocalSpace) => Promise<LocalStore>;
  close?: (space: LocalSpace) => Promise<void>;
}>;

const ActiveSpaceContext = createContext<Opened | null>(null);

/** Espaço local aberto (base de dados da conta ou do uso sem conta). */
export function useActiveSpace(): Opened {
  const value = useContext(ActiveSpaceContext);
  if (!value) throw new Error('useActiveSpace must be used inside DataGate');
  return value;
}

async function openAndSeed(
  open: (space: LocalSpace) => Promise<LocalStore>,
  space: LocalSpace,
): Promise<LocalStore> {
  const store = await open(space);
  await store.repositories.categories.seedDefaults(
    DEFAULT_CATEGORIES.map((category) => ({
      ...category,
      name: i18n.t(`categories.defaults.${category.key}`),
    })),
  );
  return store;
}

/**
 * Abre a base de dados do espaço ativo antes de mostrar a app; em caso de falha explica o motivo.
 * Ao mudar de espaço (entrar ou sair da conta) a app continua montada até o novo estar pronto,
 * e só então a ligação anterior é fechada.
 */
export function DataGate({
  space = ANONYMOUS_SPACE,
  open = openLocalSpace,
  close = closeLocalSpace,
  children,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [state, setState] = useState<State>({ status: 'opening', current: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    openAndSeed(open, space).then(
      (store) => {
        if (!active) return;
        setState((previous) => {
          const before = previous.status === 'error' ? null : previous.current;
          // O espaço sem conta fica aberto (pode ser preciso para importar dados para a conta).
          if (before?.space.kind === 'user' && !sameSpace(before.space, space)) {
            void close(before.space);
          }
          return { status: 'ready', current: { space, store } };
        });
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
    // `space` é comparado pelo nome da base de dados, não pela identidade do objeto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, close, space.kind === 'user' ? space.userId : null, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'opening', current: null });
    setAttempt((value) => value + 1);
  }, []);

  if (state.status === 'error') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon={state.reason === 'otherTab' ? 'copy-outline' : 'alert-circle-outline'}
          title={t(`database.${state.reason}.title`)}
          description={t(`database.${state.reason}.description`)}>
          {state.reason === 'schemaTooNew' ? null : (
            <Button label={t('common.retry')} icon="refresh" onPress={retry} />
          )}
        </EmptyState>
      </View>
    );
  }

  if (state.current) {
    return (
      <ActiveSpaceContext.Provider value={state.current}>
        <RepositoriesProvider repositories={state.current.store.repositories}>
          {children}
        </RepositoriesProvider>
      </ActiveSpaceContext.Provider>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} accessibilityLabel={t('database.opening')} />
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
