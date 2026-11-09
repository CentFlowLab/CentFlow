import { fireEvent, screen } from '@testing-library/react-native';

import { ANONYMOUS_SPACE, getImportState } from '@/data';
import { deleteLocalSpace } from '@/data/open-app-database';
import { openTestStore } from '@/test-utils/node-sqlite-driver';
import { renderWithProviders } from '@/test-utils/render';

import { ImportDialog } from '../ImportDialog';

describe('ImportDialog', () => {
  it('only deletes the data without an account after a second confirmation', async () => {
    const account = await openTestStore();
    const onClose = jest.fn();
    jest.mocked(deleteLocalSpace).mockClear();
    await renderWithProviders(
      <ImportDialog visible account={account} onStart={async () => null} onClose={onClose} />,
    );

    expect(await screen.findByText('Juntar os dados deste dispositivo à conta?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Apagar do dispositivo' }));
    expect(await screen.findByText('Apagar os dados sem conta?')).toBeOnTheScreen();
    expect(deleteLocalSpace).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Apagar' }));
    await screen.findByText('Apagar os dados sem conta?').catch(() => undefined);
    expect(deleteLocalSpace).toHaveBeenCalledWith(ANONYMOUS_SPACE);
    expect((await getImportState(account)).state).toBe('declined');
    expect(onClose).toHaveBeenCalled();
    await account.db.close();
  });
});
