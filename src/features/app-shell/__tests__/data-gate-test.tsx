import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { DatabaseUnavailableError, useDataQuery, type LocalStore, type Repositories } from '@/data';
import { openTestStore } from '@/test-utils/node-sqlite-driver';
import { renderWithProviders } from '@/test-utils/render';

import { DataGate } from '../DataGate';

const listCategoryNames = async (repositories: Repositories) =>
  (await repositories.categories.list()).map((category) => category.name);

function CategoryNames() {
  const query = useDataQuery(listCategoryNames);
  return <Text>{query.data?.join(', ') ?? ''}</Text>;
}

describe('DataGate', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('opens the database and seeds translated default categories once', async () => {
    const store = await openTestStore();
    const open = jest.fn(async () => store);
    await renderWithProviders(
      <DataGate open={open}>
        <CategoryNames />
      </DataGate>,
    );
    expect(await screen.findByText(/^Casa, Supermercado, Restaurantes/)).toBeOnTheScreen();
    expect(await store.repositories.categories.seedDefaults([])).toBe(false);
  });

  it('explains when another tab holds the database and retries on demand', async () => {
    const store = await openTestStore();
    const open = jest
      .fn<Promise<LocalStore>, []>()
      .mockRejectedValueOnce(new DatabaseUnavailableError('otherTab'))
      .mockResolvedValueOnce(store);

    await renderWithProviders(
      <DataGate open={open}>
        <Text>App pronta</Text>
      </DataGate>,
    );
    expect(await screen.findByText('O CentFlow está aberto noutro separador')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('App pronta')).toBeOnTheScreen();
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('explains missing cross-origin isolation on the web', async () => {
    const open = jest.fn(async () => {
      throw new DatabaseUnavailableError('notIsolated');
    });
    await renderWithProviders(<DataGate open={open}>{null}</DataGate>);
    expect(await screen.findByText('Armazenamento local indisponível')).toBeOnTheScreen();
  });

  it('does not offer a retry when the schema is newer than the app', async () => {
    const open = jest.fn(async () => {
      throw new DatabaseUnavailableError('schemaTooNew');
    });
    await renderWithProviders(<DataGate open={open}>{null}</DataGate>);
    expect(await screen.findByText('Atualiza a aplicação')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull();
  });
});
