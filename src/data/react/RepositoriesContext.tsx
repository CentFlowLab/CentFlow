import { createContext, useContext, type PropsWithChildren } from 'react';

import type { Repositories } from '../repositories/types';

const RepositoriesContext = createContext<Repositories | null>(null);

export function RepositoriesProvider({
  repositories,
  children,
}: PropsWithChildren<{ repositories: Repositories }>) {
  return (
    <RepositoriesContext.Provider value={repositories}>{children}</RepositoriesContext.Provider>
  );
}

export function useRepositories(): Repositories {
  const repositories = useContext(RepositoriesContext);
  if (!repositories) throw new Error('useRepositories must be used inside RepositoriesProvider');
  return repositories;
}
