import { useEffect, useState } from 'react';

import type { Repositories } from '../repositories/types';
import { useRepositories } from './RepositoriesContext';

export type DataQueryState<T> =
  | { status: 'loading'; data: T | undefined; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: T | undefined; error: unknown };

/**
 * Executa uma leitura nos repositórios e repete-a automaticamente após cada escrita.
 * `query` deve ser estável (useCallback); quando muda, a leitura é refeita.
 * Mantém os dados anteriores durante o recarregamento para evitar "saltos" na interface.
 */
export function useDataQuery<T>(
  query: (repositories: Repositories) => Promise<T>,
): DataQueryState<T> {
  const repositories = useRepositories();
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<DataQueryState<T>>({
    status: 'loading',
    data: undefined,
    error: null,
  });
  const [source, setSource] = useState(repositories);
  if (source !== repositories) {
    // Outro espaço local (ex.: terminar sessão): nunca mostrar dados do anterior.
    setSource(repositories);
    setState({ status: 'loading', data: undefined, error: null });
  }

  useEffect(() => repositories.subscribe(() => setVersion((value) => value + 1)), [repositories]);

  useEffect(() => {
    let active = true;
    query(repositories).then(
      (data) => {
        if (active) setState({ status: 'success', data, error: null });
      },
      (error: unknown) => {
        if (active) setState((previous) => ({ status: 'error', data: previous.data, error }));
      },
    );
    return () => {
      active = false;
    };
  }, [query, repositories, version]);

  return state;
}
